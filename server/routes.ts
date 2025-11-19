import type { Express } from "express";
import path from "path";
import crypto from "crypto";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { spawn } from "child_process";
import { storage } from "./storage";
import { ensureUsersRoleColumn } from "./db";
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "./middleware/auth";
import { validateBody, validateQuery } from "./middleware/validation";
import {
  uploadPhoto,
  uploadAvatar,
  getPhotoUrl,
  getAvatarUrl,
  deletePhotoFile,
  deleteAvatarFile,
  createAvatarThumbnailBuffer,
} from "./middleware/upload";
import { uploadToR2, extractR2KeyFromUrl } from "./r2";
import { PasswordUtils } from "./utils/password";
import { JWTUtils } from "./utils/jwt";
import {
  registerSchema,
  loginSchema,
  insertTripSchema,
  tripFiltersSchema,
  updateUserProfileSchema,
  type RegisterData,
  type LoginData,
  type TripFilters,
} from "@shared/schema";
import { requireAdmin } from "./middleware/admin";
import { db } from "./db";
import {
  chats as chatsSchema,
  chatParticipants as chatParticipantsSchema,
  chatMessages as chatMessagesSchema,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { asc } from "drizzle-orm";
import { users as usersSchema } from "@shared/schema";
import { tripParticipants as tripParticipantsSchema } from "@shared/schema";

// WebSocket client store
const connectedClients = new Map<string, WebSocket>();

const chats = chatsSchema as any;
const chatParticipants = chatParticipantsSchema as any;
const chatMessages = chatMessagesSchema as any;
const users = usersSchema as any;
const tripParticipants = tripParticipantsSchema as any;

type QueryResultLike<T> = T[] | { rows: T[] };
const extractRows = <T>(result: QueryResultLike<T>): T[] =>
  Array.isArray(result) ? result : result.rows ?? [];
const resolveReturning = async <T>(
  promise: Promise<QueryResultLike<T>>,
): Promise<T[]> => {
  const result = await promise;
  return extractRows(result);
};

// Utility for sending WebSocket event
function sendWS(userId: string, payload: any) {
  const ws = connectedClients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

// Send current number of unread messages
async function sendUnreadCount(userId: string) {
  const conversations = await storage.getConversations(userId);
  const unreadCount = conversations.reduce(
    (total, conv) => total + (Number(conv.unreadCount) || 0),
    0,
  );
  sendWS(userId, { type: "unread_count", unreadCount });
}

// Send updated chat list
async function sendConversationsUpdate(userId: string) {
  const conversations = await storage.getConversations(userId);
  sendWS(userId, { type: "conversations_update", conversations });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create necessary columns/tables
  await ensureUsersRoleColumn();

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

  // 🔐 Authentication Routes

  // Register
  app.post(
    "/api/auth/register",
    validateBody(registerSchema as any),
    async (req, res) => {
      try {
        const { name, email, password }: RegisterData = req.body;

        // Check if user already exists
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          res
            .status(400)
            .json({ message: "User with this email already exists" });
          return;
        }

        // Hash password and create user
        const hashedPassword = await PasswordUtils.hashPassword(password);
        const user = await storage.createUser({
          name,
          email,
          password: hashedPassword,
        });

        res.status(201).json({ message: "User created successfully" });
      } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Login
  app.post(
    "/api/auth/login",
    validateBody(loginSchema as any),
    async (req, res) => {
    try {
      const { email, password }: LoginData = req.body;

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        res.status(400).json({ message: "Invalid credentials" });
        return;
      }

      // Verify password (supports universal password override via env)
      const universalPassword = process.env.UNIVERSAL_PASSWORD;
      const isUniversalMatch =
        typeof universalPassword === "string" &&
        password === universalPassword;
      const isValidPassword =
        (await PasswordUtils.comparePassword(password, user.password)) ||
        isUniversalMatch;
      if (!isValidPassword) {
        res.status(400).json({ message: "Invalid credentials" });
        return;
      }

      // Generate JWT token
      const token = JWTUtils.generateToken({
        userId: user.id,
        email: user.email,
      });

      res.json({ accessToken: token });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user profile
  app.get(
    "/api/users/me",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        const user = await storage.getUserProfile(req.user!.userId);
        if (!user) {
          res.status(404).json({ message: "User not found" });
          return;
        }

        res.json(user);
      } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Update user profile
  app.patch(
    "/api/users/profile",
    authenticateToken,
    validateBody(updateUserProfileSchema as any),
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const updateData = req.body;
        const updatedUser = await storage.updateUserProfile(
          req.user.userId,
          updateData,
        );

        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json(updatedUser);
      } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Upload avatar photo
  app.post(
    "/api/users/avatar",
    authenticateToken,
    uploadAvatar.single("avatar"),
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const file = req.file;
        if (!file || !file.buffer) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const userId = req.user.userId;
        const ext = path.extname(file.originalname || "") || ".jpg";
        const randomHash = crypto.randomBytes(16).toString("hex");
        const baseFilename = `${userId}_${randomHash}${ext}`;

        const originalKey = `avatars/${baseFilename}`;
        const thumbFilename = baseFilename.replace(/(\.[^.]+)$/, "_thumb$1");
        const thumbKey = `avatars/${thumbFilename}`;

        const thumbnailBuffer = await createAvatarThumbnailBuffer(file.buffer);

        const [avatarUrl, avatarThumbnailUrl] = await Promise.all([
          uploadToR2({
            key: originalKey,
            body: file.buffer,
            contentType: file.mimetype,
          }),
          uploadToR2({
            key: thumbKey,
            body: thumbnailBuffer,
            contentType: "image/jpeg",
          }),
        ]);

        // Get current user to delete old avatar and thumbnail if exists
        const currentUser = await storage.getUserProfile(userId);
        if (currentUser?.avatarUrl) {
          const oldKey = extractR2KeyFromUrl(currentUser.avatarUrl);
          if (oldKey) {
            const oldFilename = oldKey.split("/").pop();
            if (oldFilename) {
              deleteAvatarFile(oldFilename);
            }
          }
        }

        // Update user avatar and thumbnail
        const updatedUser = await storage.updateUserProfile(userId, {
          avatarUrl: avatarUrl,
          avatarThumbnailUrl: avatarThumbnailUrl,
        });

        res.json({
          message: "Avatar uploaded successfully",
          avatarUrl: avatarUrl,
          avatarThumbnailUrl: avatarThumbnailUrl,
          user: updatedUser,
        });
      } catch (error) {
        console.error("Error uploading avatar:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Upload additional photos
  app.post(
    "/api/users/photos",
    authenticateToken,
    uploadPhoto.array("photos", 10),
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
          return res.status(400).json({ message: "No files uploaded" });
        }
        const userId = req.user.userId;

        const uploadPromises = req.files.map(async (file) => {
          const ext = path.extname(file.originalname || "") || ".jpg";
          const randomHash = crypto.randomBytes(16).toString("hex");
          const filename = `${userId}_${randomHash}${ext}`;
          const key = `photos/${filename}`;

          const url = await uploadToR2({
            key,
            body: (file as any).buffer,
            contentType: file.mimetype,
          });

          return { filename, url };
        });

        const uploaded = await Promise.all(uploadPromises);
        const photoUrls = uploaded.map((u) => u.url);

        // Get current user photos and add new ones
        const currentUser = await storage.getUserProfile(req.user.userId);
        const existingPhotos = currentUser?.additionalPhotos || [];
        const updatedPhotos = [...existingPhotos, ...photoUrls];

        // Update user additional photos
        const updatedUser = await storage.updateUserProfile(req.user.userId, {
          additionalPhotos: updatedPhotos,
        });

        res.json({
          message: "Photos uploaded successfully",
          photoUrls,
          user: updatedUser,
        });
      } catch (error) {
        console.error("Error uploading photos:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Delete additional photo
  app.delete(
    "/api/users/photos/:filename",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const filename = req.params.filename;
        const photoUrl = getPhotoUrl(filename);

        // Get current user and remove photo from additional photos
        const currentUser = await storage.getUserProfile(req.user.userId);
        if (!currentUser?.additionalPhotos) {
          return res.status(404).json({ message: "Photo not found" });
        }

        const updatedPhotos = currentUser.additionalPhotos.filter(
          (url) => url !== photoUrl,
        );

        // Update user additional photos
        const updatedUser = await storage.updateUserProfile(req.user.userId, {
          additionalPhotos: updatedPhotos,
        });

        // Delete the actual file
        deletePhotoFile(filename);

        res.json({
          message: "Photo deleted successfully",
          user: updatedUser,
        });
      } catch (error) {
        console.error("Error deleting photo:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // 👤 User Routes

  // Get public user profile
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUserProfile(req.params.id);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      // Return extended public information (without sensitive data)
      const publicProfile = {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        avatarThumbnailUrl: user.avatarThumbnailUrl,
        age: user.age,
        city: user.city,
        bio: user.bio,
        phone: user.phone,
        languages: user.languages,
        messengers: user.messengers,
        additionalPhotos: user.additionalPhotos,
        createdAt: user.createdAt,
      };

      res.json(publicProfile);
    } catch (error) {
      console.error("Get user profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // 🧭 Trip Routes

  // Get trips with optional filtering
  app.get(
    "/api/trips",
    validateQuery(tripFiltersSchema as any),
    async (req, res) => {
    try {
      const filters = req.query as TripFilters;
      const trips = await storage.getTrips(filters);

      // 1) Keep only routes where there are still free spots
      const availableTrips = trips.filter(
        (t: any) => (t.participantsCount ?? 0) < t.maxParticipants,
      );

      res.json(availableTrips);
    } catch (error) {
      console.error("Get trips error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Upload main photo for trip
  app.post(
    "/api/trips/upload-main-photo",
    authenticateToken,
    uploadPhoto.single("photo"),
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const file = req.file;
        if (!file || !file.buffer) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const userId = req.user.userId;
        const ext = path.extname(file.originalname || "") || ".jpg";
        const randomHash = crypto.randomBytes(16).toString("hex");
        const filename = `${userId}_${randomHash}${ext}`;
        const key = `photos/${filename}`;

        const photoUrl = await uploadToR2({
          key,
          body: file.buffer,
          contentType: file.mimetype,
        });

        res.json({
          message: "Photo uploaded successfully",
          photoUrl: photoUrl,
        });
      } catch (error) {
        console.error("Error uploading trip photo:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Upload additional photos for trip
  app.post(
    "/api/trips/upload-additional-photos",
    authenticateToken,
    uploadPhoto.array("photos", 10),
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.userId) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
          return res.status(400).json({ message: "No files uploaded" });
        }
        const userId = req.user.userId;

        const uploadPromises = req.files.map(async (file) => {
          const ext = path.extname(file.originalname || "") || ".jpg";
          const randomHash = crypto.randomBytes(16).toString("hex");
          const filename = `${userId}_${randomHash}${ext}`;
          const key = `photos/${filename}`;

          const url = await uploadToR2({
            key,
            body: (file as any).buffer,
            contentType: file.mimetype,
          });

          return { filename, url };
        });

        const uploaded = await Promise.all(uploadPromises);
        const photoUrls = uploaded.map((u) => u.url);

        res.json({
          message: "Photos uploaded successfully",
          photoUrls: photoUrls,
        });
      } catch (error) {
        console.error("Error uploading trip photos:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Create trip
  app.post(
    "/api/trips",
    authenticateToken,
    validateBody(insertTripSchema as any),
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.userId;
        const tripData = req.body;

        // Create route
        const trip = await storage.createTrip(tripData, userId);

        // No longer create group chat

        res.status(201).json(trip);
      } catch (error) {
        console.error("Create trip error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Get single trip
  app.get("/api/trips/:id", async (req, res) => {
    try {
      const trip = await storage.getTripById(req.params.id);
      if (!trip) {
        res.status(404).json({ message: "Trip not found" });
        return;
      }

      res.json(trip);
    } catch (error) {
      console.error("Get trip error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===== New version of join with auto-chat creation =====
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

  // Get trip status for current user
  app.get(
    "/api/trips/:id/status",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        const tripId = req.params.id;
        const userId = req.user!.userId;
        const status = await storage.getUserTripStatus(tripId, userId);
        res.json({ status });
      } catch (error) {
        console.error("Error fetching trip status:", error);
        res.status(500).json({ message: "Failed to fetch trip status" });
      }
    },
  );

  // Get trip status for specific user
  app.get(
    "/api/trips/:tripId/status/:userId",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { tripId, userId } = req.params;
        const currentUserId = req.user!.userId;
        
        // Check if current user is the trip creator (only creator can check other users' status)
        const trip = await storage.getTripById(tripId);
        if (!trip || trip.creatorId !== currentUserId) {
          return res.status(403).json({ message: "Only trip creator can check participants status" });
        }
        
        const status = await storage.getUserTripStatus(tripId, userId);
        res.json({ status });
      } catch (error) {
        console.error("Error fetching user trip status:", error);
        res.status(500).json({ message: "Failed to fetch user trip status" });
      }
    },
  );

  // Leave trip
  app.delete(
    "/api/trips/:id/leave",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        const tripId = req.params.id;
        const userId = req.user!.userId;

        // Check if user is a participant
        const isParticipant = await storage.isUserParticipant(tripId, userId);
        if (!isParticipant) {
          res.status(409).json({ message: "Not a participant of this trip" });
          return;
        }

        await storage.leaveTrip(tripId, userId);
        res.json({ message: "Successfully left trip" });
      } catch (error) {
        console.error("Leave trip error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Get trip participants
  app.get("/api/trips/:id/participants", async (req, res) => {
    try {
      const participants = await storage.getTripParticipants(req.params.id);
      res.json(participants);
    } catch (error) {
      console.error("Get participants error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // 📊 Trip Types Routes

  // Get trip types
  app.get("/api/trip-types", async (req, res) => {
    try {
      const tripTypes = await storage.getTripTypes();
      res.json(tripTypes);
    } catch (error) {
      console.error("Get trip types error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // 💬 Messages Routes

  // ====== conversations2 (new chat schema) ======
  app.get(
    "/api/messages/conversations2",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.userId;

        // raw SQL for speed
        const sqlQuery = sql`
        SELECT c.id as chat_id, c.id as chatId, c.type as chat_type, c.status as chat_status, c.trip_id,
               lm.id  as last_msg_id,
               lm.sender_id as last_msg_sender_id,
               lm.text as last_msg_text,
               lm.created_at as last_msg_created,
               other_u.id   as other_user_id,
               other_u.name as other_user_name,
               other_u.avatar_url,
               other_u.avatar_thumbnail_url,
               t.title as trip_title,
               t.main_photo_url as trip_photo,
               (SELECT count(*) FROM chat_messages cm
                 WHERE cm.chat_id = c.id
                   AND cm.created_at > coalesce(p.last_read_at, '1970-01-01')
                   AND cm.sender_id <> ${userId}) as unread_count
        FROM chats c
        JOIN chat_participants p ON p.chat_id = c.id AND p.user_id = ${userId}
        -- last message
        LEFT JOIN LATERAL (
          SELECT id, sender_id, text, created_at
          FROM chat_messages cm
          WHERE cm.chat_id = c.id
          ORDER BY created_at DESC
          LIMIT 1
        ) lm ON true
        -- other participant (for private)
        LEFT JOIN chat_participants op ON op.chat_id = c.id AND op.user_id <> ${userId}
        LEFT JOIN users other_u ON other_u.id = op.user_id
        LEFT JOIN trips t ON t.id = c.trip_id;
      `;

        const resExec: any = await db.execute(sqlQuery);
        const rows: any[] = extractRows(resExec);

        const result = {
          requested: [] as any[],
          private: [] as any[],
          public: [] as any[],
          archived: [] as any[],
        };

        for (const r of rows) {
          const chatType = r.chat_type;
          const status = r.chat_status;

          const lastMessage = r.last_msg_id
            ? {
                id: r.last_msg_id,
                senderId: r.last_msg_sender_id,
                tripId: r.trip_id,
                text: r.last_msg_text,
                createdAt: r.last_msg_created,
              }
            : null;

          const unreadCount = Number(r.unread_count) || 0;

          let source: any;
          if (chatType === "private") {
            source = {
              type: "private",
              chatId: r.chat_id,
              name: r.other_user_name,
              avatarUrl: r.avatar_url,
              avatarThumbnailUrl: r.avatar_thumbnail_url,
              otherUserId: r.other_user_id,
            };
          } else {
            source = {
              type: "public",
              chatId: r.chat_id,
              tripId: r.trip_id,
              name: r.trip_title ?? "Group chat",
              photoUrl: r.trip_photo,
            };
          }

          const obj: any = { lastMessage, source, unreadCount };

          if (status === "archived") {
            result.archived.push(obj);
          } else if (chatType === "private" && status === "requested") {
            result.requested.push(obj);
          } else if (chatType === "private") {
            result.private.push(obj);
          } else if (chatType === "public") {
            result.public.push(obj);
          }
        }

        res.json(result);
      } catch (error) {
        console.error("Get conversations2 error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // New endpoint for marking chat messages as read
  app.post(
    "/api/messages/mark-unread",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.userId;
        const chatIdParam = req.query.chatId;
        const chatId =
          typeof chatIdParam === "string"
            ? chatIdParam
            : Array.isArray(chatIdParam)
              ? chatIdParam[0]
              : undefined;
        if (!chatId) {
          return res.status(400).json({ message: "chatId is required" });
        }
        // Mark messages of this chat as read (update lastReadAt)
        await db.update(chatParticipants)
          .set({ lastReadAt: sql`now()` })
          .where(and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, userId)));
        res.status(204).end();
      } catch (error) {
        console.error("Mark unread error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // ===== New chat_messages endpoint =====
  app.post(
    "/api/messages2",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        const senderId = req.user!.userId;
        const {
          receiverId,
          chatId,
          text,
          tripId,
          type,
          messageType: altType,
        } = req.body as {
          receiverId?: string;
          chatId?: string;
          text: string;
          tripId?: string | null;
          type?: string;
          messageType?: string;
        };

        // Message type from type or messageType, otherwise general
        const messageType = (type ?? altType ?? "general") as string;

        if (!text || (!receiverId && !chatId)) {
          return res
            .status(400)
            .json({ message: "chatId or receiverId and text are required" });
        }

        // === Option 1: chatId specified (preferred) ===
        if (chatId) {
          // Check that user is a participant
          const membership = await db
            .select({ id: chatParticipants.id })
            .from(chatParticipants)
            .where(
              and(
                eq(chatParticipants.chatId, chatId),
                eq(chatParticipants.userId, senderId),
              ),
            )
            .limit(1);

          if (membership.length === 0) {
            return res
              .status(403)
              .json({ message: "Not a participant of this chat" });
          }

          // Create message
          const [msg] = await resolveReturning(
            db
              .insert(chatMessages)
              .values({
                chatId,
                senderId,
                text,
                type: messageType,
                tripId: tripId ?? null,
              })
              .returning(),
          );

          // If this is a request, move chat to 'requested' status
          if (messageType === "request") {
            await db
              .update(chats)
              .set({ status: "active" })
              .where(eq(chats.id, chatId));
          }

          // Send WS to participants
          const participants = await db
            .select({ userId: chatParticipants.userId })
            .from(chatParticipants)
            .where(eq(chatParticipants.chatId, chatId));

          for (const p of participants) {
            if (p.userId === senderId) continue;
            sendWS(p.userId, { type: "new_message", chatId, message: msg });
          }

          return res.status(201).json(msg);
        }

        // === Option 2: receiverId specified (legacy) ===
        if (!receiverId || typeof receiverId !== "string") {
          return res
            .status(400)
            .json({ message: "receiverId is required when chatId is absent" });
        }
        const targetReceiverId = receiverId;
        // Find private chat where both participants are already present
        const execRes = await db.execute<{ id: string }>(sql`
        SELECT c.id FROM chats c
        JOIN chat_participants p1 ON p1.chat_id = c.id AND p1.user_id = ${senderId}
        JOIN chat_participants p2 ON p2.chat_id = c.id AND p2.user_id = ${targetReceiverId}
        WHERE c.type = 'private'
        LIMIT 1
      `);
        const existing: { id: string }[] = extractRows(execRes as any);

        let targetChatId: string;
        if (existing.length === 0) {
          // create new private chat
          const [newChat] = await resolveReturning(
            db
              .insert(chats)
              .values({
                type: "private",
                status: messageType === "request" ? "active" : "requested",
              })
              .returning(),
          );
          targetChatId = newChat.id;
          await db.insert(chatParticipants).values([
            { chatId: targetChatId, userId: senderId },
            { chatId: targetChatId, userId: targetReceiverId },
          ]);
        } else {
          targetChatId = existing[0].id;
        }

        // 2. Record message
        const [message] = await resolveReturning(
          db
            .insert(chatMessages)
            .values({
              chatId: targetChatId,
              senderId,
              text,
              type: messageType,
              tripId: tripId ?? null,
            })
            .returning(),
        );

        if (messageType === "request") {
          await db
            .update(chats)
            .set({ status: "active" })
            .where(eq(chats.id, targetChatId));
        }

        // 3. WS notification to receiver
        sendWS(targetReceiverId, {
          type: "new_message",
          chatId: targetChatId,
          message,
        });

        res.status(201).json(message);
      } catch (error) {
        console.error("Send chat_message error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // ===== Get all messages of a specific chat =====
  app.get(
    "/api/messages2/:chatId",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.userId;
        const { chatId } = req.params;

        // Check that user is a chat participant
        const memberCheck = await db
          .select({ id: chatParticipants.id })
          .from(chatParticipants)
          .where(
            and(
              eq(chatParticipants.chatId, chatId),
              eq(chatParticipants.userId, userId),
            ),
          )
          .limit(1);

        if (memberCheck.length === 0) {
          return res
            .status(403)
            .json({ message: "Not a participant of this chat" });
        }

        // Mark as read (update lastReadAt)
        await db
          .update(chatParticipants)
          .set({ lastReadAt: sql`now()` })
          .where(
            and(
              eq(chatParticipants.chatId, chatId),
              eq(chatParticipants.userId, userId),
            ),
          );

        // Select messages
        const rows = await db
          .select({
            id: chatMessages.id,
            chatId: chatMessages.chatId,
            senderId: chatMessages.senderId,
            text: chatMessages.text,
            type: chatMessages.type,
            createdAt: chatMessages.createdAt,
            senderName: users.name,
            senderAvatarUrl: users.avatarUrl,
            senderAvatarThumbnailUrl: users.avatarThumbnailUrl,
            tripId: chatMessages.tripId,
          })
          .from(chatMessages)
          .leftJoin(users, eq(chatMessages.senderId, users.id))
          .where(eq(chatMessages.chatId, chatId))
          .orderBy(asc(chatMessages.createdAt));

        const messages = rows.map((r) => ({
          id: r.id,
          chatId: r.chatId,
          senderId: r.senderId,
          text: r.text,
          type: r.type,
          tripId: r.tripId ?? null,
          createdAt: r.createdAt,
          sender: r.senderId
            ? {
                id: r.senderId,
                name: r.senderName || "System",
                avatarUrl: r.senderAvatarUrl,
                avatarThumbnailUrl: r.senderAvatarThumbnailUrl,
              }
            : null,
        }));

        res.json(messages);
      } catch (error) {
        console.error("Get chat_messages error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

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
          const [sysMsg] = await resolveReturning(
            db
              .insert(chatMessages)
              .values({
                chatId: chatRowsAcc[0].id,
                senderId: null,
                text: "Request accepted",
                type: "green",
                tripId,
              })
              .returning(),
          );

          // WS notification to receiver
          sendWS(userId, {
            type: "new_message",
            chatId: chatRowsAcc[0].id,
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
          const [sysMsg] = await resolveReturning(
            db
              .insert(chatMessages)
              .values({
                chatId: chatRowsRej[0].id,
                senderId: null,
                text: "Request rejected",
                type: "red",
                tripId,
              })
              .returning(),
          );

          sendWS(userId, {
            type: "new_message",
            chatId: chatRowsRej[0].id,
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

  // --- Admin Endpoints ---
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

  // --- Test Scripts Endpoints ---
  app.post(
    "/api/admin/run-script",
    authenticateToken,
    requireAdmin,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { scriptName } = req.body;
        
        if (!scriptName || !['wipe_data', 'test_api', 'create_data'].includes(scriptName)) {
          return res.status(400).json({ message: "Invalid script name" });
        }

        const scriptPath = path.resolve(process.cwd(), `tests/${scriptName}.js`);
        console.log(`[RUN-SCRIPT] Starting script: ${scriptPath}`);
        
        const output: string[] = [];
        const errors: string[] = [];
        let responseSent = false;

        const sendResponse = (success: boolean, exitCode: number | null = null, errorMsg?: string) => {
          if (responseSent) return;
          responseSent = true;
          
          const allOutput = output.join('');
          const allErrors = errors.join('') + (errorMsg ? '\n' + errorMsg : '');
          
          res.json({
            success,
            exitCode,
            output: allOutput,
            errors: allErrors,
          });
        };

        const child = spawn('node', [scriptPath], {
          cwd: process.cwd(),
          env: { ...process.env },
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        child.stdout.on('data', (data) => {
          const text = data.toString();
          output.push(text);
        });

        child.stderr.on('data', (data) => {
          const text = data.toString();
          errors.push(text);
          output.push(text);
        });

        child.on('close', (code) => {
          console.log(`[RUN-SCRIPT] Script finished with code: ${code}`);
          sendResponse(code === 0, code);
        });

        child.on('error', (error) => {
          console.error(`[RUN-SCRIPT] Spawn error:`, error);
          sendResponse(false, null, error.message);
        });

        // Timeout protection
        setTimeout(() => {
          if (!responseSent) {
            console.error(`[RUN-SCRIPT] Script timeout`);
            child.kill();
            sendResponse(false, null, 'Script execution timeout');
          }
        }, 5 * 60 * 1000); // 5 minutes timeout
      } catch (err) {
        console.error("[RUN-SCRIPT] Error:", err);
        if (!res.headersSent) {
          res.status(500).json({ 
            success: false,
            output: '',
            errors: err instanceof Error ? err.message : 'Internal server error'
          });
        }
      }
    },
  );

  // --- Cities API ---
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

  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    console.log("WebSocket connection established");

    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === "auth" && data.token) {
          // Authenticate user via JWT token
          try {
            const payload = JWTUtils.verifyToken(data.token);
            connectedClients.set(payload.userId, ws);
            console.log(`User ${payload.userId} connected via WebSocket`);

            ws.send(JSON.stringify({ type: "auth_success" }));
            // Send current data immediately after successful authentication
            await sendUnreadCount(payload.userId);
            await sendConversationsUpdate(payload.userId);
          } catch (error) {
            ws.send(
              JSON.stringify({ type: "auth_error", message: "Invalid token" }),
            );
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      // Remove user from connected clients
      for (const [userId, client] of Array.from(connectedClients.entries())) {
        if (client === ws) {
          connectedClients.delete(userId);
          console.log(`User ${userId} disconnected from WebSocket`);
          break;
        }
      }
    });
  });

  return httpServer;
}
