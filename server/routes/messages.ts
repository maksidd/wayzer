import { Router } from "express";
import { WebSocket } from "ws";
import { sql, eq, and, asc } from "drizzle-orm";
import { storage } from "../storage";
import { db } from "../db";
import {
    chats,
    chatParticipants,
    chatMessages,
    users,
} from "@shared/schema";
import { authenticateToken, type AuthenticatedRequest } from "../middleware/auth";

// WebSocket client store - exported to be used by other modules if needed, 
// though ideally this should be in a separate service.
export const connectedClients = new Map<string, WebSocket>();

// Utility for sending WebSocket event
export function sendWS(userId: string, payload: any) {
    const ws = connectedClients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
    }
}

// Send updated chat list
export async function sendConversationsUpdate(userId: string) {
    const conversations = await storage.getConversationBuckets(userId);
    sendWS(userId, { type: "conversations_update", conversations });
}

export async function sendUnreadCount(userId: string) {
    const buckets = await storage.getConversationBuckets(userId);
    const unreadCount = [
        ...buckets.requested,
        ...buckets.private,
        ...buckets.public,
        ...buckets.archived,
    ].reduce((total, conv) => total + (Number(conv.unreadCount) || 0), 0);
    sendWS(userId, { type: "unread_count", unreadCount });
}

export async function markChatAsReadForUser(chatId: string, userId: string) {
    await db
        .update(chatParticipants)
        .set({ lastReadAt: sql`now()` })
        .where(and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, userId)));
}

type QueryResultLike<T> = T[] | { rows: T[] };
const extractRows = <T>(result: QueryResultLike<T>): T[] =>
    Array.isArray(result) ? result : result.rows ?? [];
const resolveReturning = async <T>(
    promise: Promise<QueryResultLike<T>>,
): Promise<T[]> => {
    const result = await promise;
    return extractRows(result);
};

const router = Router();
const messages2Router = Router();

// ====== conversations2 (new chat schema) ======
router.get(
    "/conversations2",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
        try {
            const userId = req.user!.userId;
            const conversations = await storage.getConversationBuckets(userId);
            res.json(conversations);
        } catch (error) {
            console.error("Get conversations2 error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
);

// New endpoint for marking chat messages as read
router.post(
    "/mark-read",
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
messages2Router.post(
    "/", // Note: In routes.ts it was /api/messages2, so here it will be mounted under /api, so /messages2
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
messages2Router.get(
    "/:chatId",
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

export default router;
export { messages2Router };
