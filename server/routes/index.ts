import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "../storage";
import { ensureUsersRoleColumn, ensureUsersStatusColumn } from "../db";
import { PasswordUtils } from "../utils/password";
import { requireAdmin } from "../middleware/admin";
import { authenticateToken, type AuthenticatedRequest } from "../middleware/auth";
import { JWTUtils } from "../utils/jwt";
// Import routers
import authRouter from "./auth";
import usersRouter from "./users";
import tripsRouter from "./trips";
import messagesRouter, { connectedClients, messages2Router } from "./messages";

export async function registerRoutes(app: Express): Promise<Server> {
    // Create necessary columns/tables
    await ensureUsersRoleColumn();
    await ensureUsersStatusColumn();

    // Create admin account if it doesn't exist and credentials are provided
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
        const existingAdmin = await storage.getUserByEmail(adminEmail);
        if (!existingAdmin) {
            const hashed = await PasswordUtils.hashPassword(adminPassword);
            await storage.createUser({
                name: "Admin",
                email: adminEmail,
                password: hashed,
                role: "admin",
            } as any);
            console.log("[INIT] Admin user created via bootstrap email");
        }
    }

    // Initialize trip types on startup
    await storage.initializeTripTypes();

    // Mount routers
    app.use("/api/auth", authRouter);
    app.use("/api/users", usersRouter);
    app.use("/api/trips", tripsRouter);
    app.use("/api/messages", messagesRouter); // Note: messagesRouter handles /conversations2, /mark-read
    app.use("/api/messages2", messages2Router); // messages2Router handles POST /messages2 and GET /messages2/:chatId

    // Legacy/Mixed routes that need to be properly refactored or moved later

    // 📊 Trip Types Routes
    app.get("/api/trip-types", async (req, res) => {
        try {
            const tripTypes = await storage.getTripTypes();
            res.json(tripTypes);
        } catch (error) {
            console.error("Get trip types error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // 🧭 Trip Routes (Legacy / Special)
    app.post(
        "/api/trips2/:id/join",
        authenticateToken,
        async (req: AuthenticatedRequest, res) => {
            try {
                const tripId = req.params.id;
                const userId = req.user!.userId;

                // Check route
                const trip = await storage.getTripById(tripId);
                if (!trip) return res.status(404).json({ message: "Trip not found" });

                // Creator cannot join themselves
                if (trip.creatorId === userId)
                    return res.status(409).json({ message: "Cannot join your own trip" });

                // Check status
                const existingStatus = await storage.getUserTripStatus(tripId, userId);
                if (existingStatus) {
                    return res
                        .status(400)
                        .json({
                            message: "You have already applied for this trip",
                            status: existingStatus,
                        });
                }

                // Add participation request (pending)
                await storage.joinTrip(tripId, userId);

                // No longer create any chats as part of join
                return res.json({
                    message: "Trip application submitted",
                    status: "pending",
                });
            } catch (error) {
                console.error("Join trip2 error:", error);
                res.status(500).json({ message: "Internal server error" });
            }
        },
    );

    // Accept/Reject trip requests
    const { sql, eq, and } = await import("drizzle-orm");
    const { db } = await import("../db");
    const {
        chats,
        chatParticipants,
        chatMessages,
        users,
        tripParticipants,
    } = await import("@shared/schema");
    const { sendWS, sendConversationsUpdate, markChatAsReadForUser } = await import("./messages");
    const { JWTUtils } = await import("../utils/jwt");

    type QueryResultLike<T> = T[] | { rows: T[] };
    const extractRows = <T>(result: QueryResultLike<T>): T[] =>
        Array.isArray(result) ? result : result.rows ?? [];
    const resolveReturning = async <T>(
        promise: Promise<QueryResultLike<T>>,
    ): Promise<T[]> => {
        const result = await promise;
        return extractRows(result);
    };

    // Accept trip join request
    app.post(
        "/api/trips/:tripId/accept/:userId",
        authenticateToken,
        async (req: AuthenticatedRequest, res) => {
            try {
                const currentUserId = req.user!.userId;
                const { tripId, userId } = req.params;

                // Check if current user is the trip creator
                const trip = await storage.getTripById(tripId);
                if (!trip || trip.creatorId !== currentUserId) {
                    res
                        .status(403)
                        .json({ message: "Only trip creator can accept requests" });
                    return;
                }

                // Get user information
                const creator = await storage.getUser(currentUserId);
                const participant = await storage.getUser(userId);

                // Accept request
                await storage.acceptTripRequest(tripId, userId);

                // Update private chat status to active
                const chatResAcc = await db.execute<{ id: string }>(sql`
        SELECT c.id FROM chats c
        JOIN chat_participants p1 ON p1.chat_id = c.id AND p1.user_id = ${currentUserId}
        JOIN chat_participants p2 ON p2.chat_id = c.id AND p2.user_id = ${userId}
        WHERE c.type = 'private'
        LIMIT 1
      `);
                const chatRowsAcc: { id: string }[] = extractRows(chatResAcc as any);
                if (chatRowsAcc.length > 0) {
                    await db
                        .update(chats)
                        .set({ status: "active" })
                        .where(eq(chats.id, chatRowsAcc[0].id));
                }

                // Record system message in chat_messages (green)
                if (chatRowsAcc.length > 0) {
                    const chatId = chatRowsAcc[0].id;
                    const [sysMsg] = await resolveReturning(
                        db
                            .insert(chatMessages)
                            .values({
                                chatId,
                                senderId: null,
                                text: "Request accepted",
                                type: "green",
                                tripId,
                            })
                            .returning(),
                    );

                    // Creator already knows about their action, mark chat as read for them
                    await markChatAsReadForUser(chatId, currentUserId);

                    // WS notification to participant who should see it as unread
                    sendWS(userId, {
                        type: "new_message",
                        chatId,
                        message: sysMsg,
                    });
                }

                // If this is a group route (3+ participants), add message about route chat availability
                if (trip.maxParticipants >= 3 && chatRowsAcc.length > 0) {
                    const [chatAvailableMsg] = await resolveReturning(
                        db
                            .insert(chatMessages)
                            .values({
                                chatId: chatRowsAcc[0].id,
                                senderId: null,
                                text: "Trip chat is available",
                                type: "yellow",
                                tripId,
                            })
                            .returning(),
                    );

                    // WS notifications to both participants
                    sendWS(userId, {
                        type: "new_message",
                        chatId: chatRowsAcc[0].id,
                        message: chatAvailableMsg,
                    });
                    sendWS(currentUserId, {
                        type: "new_message",
                        chatId: chatRowsAcc[0].id,
                        message: chatAvailableMsg,
                    });
                }

                // If this is a group route (3+ participants)
                if (trip.maxParticipants >= 3) {
                    // Check if there's already a public chat for this route
                    const existingPublicChat = await db
                        .select({ id: chats.id })
                        .from(chats)
                        .where(and(eq(chats.type, "public"), eq(chats.tripId, tripId)))
                        .limit(1);

                    let publicChatId: string;
                    const isNewChat = existingPublicChat.length === 0;

                    if (isNewChat) {
                        // Create new public chat for route
                        const [newPublicChat] = await resolveReturning(
                            db
                                .insert(chats)
                                .values({ type: "public", tripId, status: "active" })
                                .returning(),
                        );
                        publicChatId = newPublicChat.id;
                    } else {
                        publicChatId = existingPublicChat[0].id;
                    }

                    // Get all approved route participants
                    const participants = await storage.getTripParticipants(tripId);

                    // Add all participants to public chat if not already there
                    for (const participant of participants) {
                        const existingParticipant = await db
                            .select()
                            .from(chatParticipants)
                            .where(
                                and(
                                    eq(chatParticipants.chatId, publicChatId),
                                    eq(chatParticipants.userId, participant.id),
                                ),
                            )
                            .limit(1);

                        if (existingParticipant.length === 0) {
                            await db
                                .insert(chatParticipants)
                                .values({ chatId: publicChatId, userId: participant.id });
                        }
                    }

                    // Add system messages to public chat
                    if (isNewChat) {
                        // If chat was just created, add two messages
                        const [creatorMsg] = await resolveReturning(
                            db
                                .insert(chatMessages)
                                .values({
                                    chatId: publicChatId,
                                    senderId: null,
                                    text: `Route creator: ${creator?.name || "Unknown"}`,
                                    type: "yellow",
                                    tripId,
                                })
                                .returning(),
                        );

                        const [participantMsg] = await resolveReturning(
                            db
                                .insert(chatMessages)
                                .values({
                                    chatId: publicChatId,
                                    senderId: null,
                                    text: `Participant joined: ${participant?.name || "Unknown"}`,
                                    type: "yellow",
                                    tripId,
                                })
                                .returning(),
                        );

                        // WS notifications to all participants
                        for (const p of participants) {
                            sendWS(p.id, {
                                type: "new_message",
                                chatId: publicChatId,
                                message: creatorMsg,
                            });
                            sendWS(p.id, {
                                type: "new_message",
                                chatId: publicChatId,
                                message: participantMsg,
                            });
                        }
                    } else {
                        // If chat already exists, add only message about new participant
                        const [participantMsg] = await resolveReturning(
                            db
                                .insert(chatMessages)
                                .values({
                                    chatId: publicChatId,
                                    senderId: null,
                                    text: `Participant joined: ${participant?.name || "Unknown"}`,
                                    type: "yellow",
                                    tripId,
                                })
                                .returning(),
                        );

                        // WS notifications to all participants
                        for (const p of participants) {
                            sendWS(p.id, {
                                type: "new_message",
                                chatId: publicChatId,
                                message: participantMsg,
                            });
                        }
                    }

                    // Update chat lists for all participants
                    for (const p of participants) {
                        await sendConversationsUpdate(p.id);
                    }
                } else {
                    // For regular route update lists only for creator and new participant
                    await sendConversationsUpdate(userId);
                    await sendConversationsUpdate(currentUserId);
                }

                res.json({ message: "Request accepted" });
            } catch (error) {
                console.error("Accept trip request error:", error);
                res.status(500).json({ message: "Internal server error" });
            }
        },
    );

    // Reject trip join request
    app.post(
        "/api/trips/:tripId/reject/:userId",
        authenticateToken,
        async (req: AuthenticatedRequest, res) => {
            try {
                const currentUserId = req.user!.userId;
                const { tripId, userId } = req.params;

                // Check if current user is the trip creator
                const trip = await storage.getTripById(tripId);
                if (!trip || trip.creatorId !== currentUserId) {
                    res
                        .status(403)
                        .json({ message: "Only trip creator can reject requests" });
                    return;
                }

                await storage.rejectTripRequest(tripId, userId);

                // Update private chat status to active
                const chatResRej = await db.execute<{ id: string }>(sql`
        SELECT c.id FROM chats c
        JOIN chat_participants p1 ON p1.chat_id = c.id AND p1.user_id = ${currentUserId}
        JOIN chat_participants p2 ON p2.chat_id = c.id AND p2.user_id = ${userId}
        WHERE c.type = 'private'
        LIMIT 1
      `);
                const chatRowsRej: { id: string }[] = extractRows(chatResRej as any);
                if (chatRowsRej.length > 0) {
                    await db
                        .update(chats)
                        .set({ status: "active" })
                        .where(eq(chats.id, chatRowsRej[0].id));
                }

                if (chatRowsRej.length > 0) {
                    const chatId = chatRowsRej[0].id;
                    const [sysMsg] = await resolveReturning(
                        db
                            .insert(chatMessages)
                            .values({
                                chatId,
                                senderId: null,
                                text: "Request rejected",
                                type: "red",
                                tripId,
                            })
                            .returning(),
                    );

                    await markChatAsReadForUser(chatId, currentUserId);

                    sendWS(userId, {
                        type: "new_message",
                        chatId,
                        message: sysMsg,
                    });
                }

                // Update chat list for both users
                await sendConversationsUpdate(userId);
                await sendConversationsUpdate(currentUserId);

                res.json({ message: "Request rejected" });
            } catch (error) {
                console.error("Reject trip request error:", error);
                res.status(500).json({ message: "Internal server error" });
            }
        },
    );

    // Favorites endpoints
    app.get(
        "/api/favorites",
        authenticateToken,
        async (req: AuthenticatedRequest, res) => {
            try {
                const userId = req.user!.userId;
                const favorites = await storage.getUserFavorites(userId);
                res.json(favorites);
            } catch (error) {
                console.error("Get favorites error:", error);
                res.status(500).json({ message: "Internal server error" });
            }
        },
    );

    app.post(
        "/api/favorites/:tripId",
        authenticateToken,
        async (req: AuthenticatedRequest, res) => {
            try {
                const userId = req.user!.userId;
                const { tripId } = req.params;

                // Check if trip exists
                const trip = await storage.getTripById(tripId);
                if (!trip) {
                    return res.status(404).json({ message: "Trip not found" });
                }

                await storage.addToFavorites(tripId, userId);
                res.status(201).json({ message: "Added to favorites" });
            } catch (error) {
                console.error("Add to favorites error:", error);
                res.status(500).json({ message: "Internal server error" });
            }
        },
    );

    app.delete(
        "/api/favorites/:tripId",
        authenticateToken,
        async (req: AuthenticatedRequest, res) => {
            try {
                const userId = req.user!.userId;
                const { tripId } = req.params;

                await storage.removeFromFavorites(tripId, userId);
                res.json({ message: "Removed from favorites" });
            } catch (error) {
                console.error("Remove from favorites error:", error);
                res.status(500).json({ message: "Internal server error" });
            }
        },
    );

    app.get(
        "/api/favorites/:tripId/status",
        authenticateToken,
        async (req: AuthenticatedRequest, res) => {
            try {
                const userId = req.user!.userId;
                const { tripId } = req.params;

                const isFavorite = await storage.isFavorite(tripId, userId);
                res.json({ isFavorite });
            } catch (error) {
                console.error("Check favorite status error:", error);
                res.status(500).json({ message: "Internal server error" });
            }
        },
    );

    // Get all routes where user participates (approved)
    app.get(
        "/api/my-trips",
        authenticateToken,
        async (req: AuthenticatedRequest, res) => {
            try {
                const userId = req.user!.userId;
                // Get ids of all routes where user is approved or pending participant
                const tripIdsRows = await db
                    .select({ tripId: tripParticipants.tripId, status: tripParticipants.status })
                    .from(tripParticipants)
                    .where(eq(tripParticipants.userId, userId));
                const tripIds = tripIdsRows.map(r => r.tripId);
                if (tripIds.length === 0) return res.json([]);
                // Get the routes themselves
                const trips = await storage.getTrips({});
                // Keep only those where user is not creator and status is approved or pending
                const myTrips = trips.filter(t => tripIdsRows.some(r => r.tripId === t.id && (r.status === 'approved' || r.status === 'pending')) && t.creatorId !== userId);
                res.json(myTrips);
            } catch (error) {
                console.error('Get my-trips error:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        },
    );

    // Cities API
    app.get("/api/cities", async (req, res) => {
        try {
            const q = (req.query.q || "").toString().toLowerCase();
            const limit = Math.min(Number(req.query.limit) || 15, 50);
            const dbq = q
                ? sql`SELECT * FROM cities WHERE lower(name) LIKE '%' || ${q} || '%' ORDER BY priority DESC, name ASC LIMIT ${limit}`
                : sql`SELECT * FROM cities ORDER BY priority DESC, name ASC LIMIT ${limit}`;
            const result: any = await db.execute(dbq);
            res.json(extractRows(result));
        } catch (error) {
            console.error("Get cities error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // --- Admin Endpoints ---
    app.use("/api/admin", (_req, res, next) => {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        next();
    });

    app.get(
        "/api/admin/users",
        authenticateToken,
        requireAdmin,
        async (req: AuthenticatedRequest, res) => {
            try {
                const users = await storage.getAllUsers();
                res.json(users);
            } catch (err) {
                console.error("Admin list users error:", err);
                res.status(500).json({ message: "Internal server error" });
            }
        },
    );

    app.delete(
        "/api/admin/users/:userId",
        authenticateToken,
        requireAdmin,
        async (req: AuthenticatedRequest, res) => {
            try {
                const { userId } = req.params;
                await storage.deleteUserCascade(userId);
                res.json({ message: "User deleted" });
            } catch (err) {
                console.error("Admin delete user error:", err);
                res.status(500).json({ message: "Internal server error" });
            }
        },
    );

    app.patch(
        "/api/admin/users/:userId/status",
        authenticateToken,
        requireAdmin,
        async (req: AuthenticatedRequest, res) => {
            try {
                const { userId } = req.params;
                const { status } = req.body as { status?: "active" | "blocked" };

                if (status !== "active" && status !== "blocked") {
                    return res.status(400).json({ message: "Invalid status" });
                }

                await storage.updateUserStatus(userId, status);

                // If user is blocked, force logout and notify chats
                if (status === "blocked") {
                    // TODO: Implement force logout and notification logic
                }

                res.json({ message: `User status updated to ${status}` });
            } catch (err) {
                console.error("Admin update user status error:", err);
                res.status(500).json({ message: "Internal server error" });
            }
        },
    );

    const httpServer = createServer(app);

    // WebSocket Setup
    const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

    wss.on("connection", (ws, req) => {
        ws.on("message", (data) => {
            try {
                const message = JSON.parse(data.toString());
                if (message.type === 'auth') {
                    // Expect token in message.token, verify and extract userId
                    const token = message.token;
                    if (token) {
                        try {
                            const payload = JWTUtils.verifyToken(token);
                            const userId = payload.userId;
                            if (userId) {
                                connectedClients.set(userId, ws);
                            }
                        } catch (e) {
                            console.error('WebSocket auth failed:', e);
                            // Close connection if auth fails
                            ws.close();
                        }
                    }
                }
            } catch (e) {
                // ignore
            }
        });

        ws.on("close", () => {
            // Remove from connectedClients
            for (const [userId, client] of connectedClients.entries()) {
                if (client === ws) {
                    connectedClients.delete(userId);
                    break;
                }
            }
        });
    });

    return httpServer;
}
