import {
    chats,
    chatParticipants,
    chatMessages,
    users,
    trips,
    type ChatConversation,
    type ChatConversationBuckets,
    type MessageWithUsers,
    type InsertMessage,
} from "@shared/schema";
import { db } from "../db";
import { sql, eq, and, asc } from "drizzle-orm";

export class MessageRepository {
    async getConversations(userId: string): Promise<ChatConversation[]> {
        if (!userId) return [];

        const query = sql`
      SELECT
        c.id as chat_id,
        c.type as chat_type,
        c.status as chat_status,
        c.trip_id,
        lm.id as last_msg_id,
        lm.sender_id as last_msg_sender_id,
        lm.trip_id as last_msg_trip_id,
        lm.text as last_msg_text,
        lm.created_at as last_msg_created,
        other_u.id as other_user_id,
        other_u.name as other_user_name,
        other_u.avatar_url,
        other_u.avatar_thumbnail_url,
        t.title as trip_title,
        t.main_photo_url as trip_photo,
        (
          SELECT count(*)
          FROM chat_messages cm
          WHERE cm.chat_id = c.id
            AND cm.created_at > coalesce(p.last_read_at, '1970-01-01')
            AND (cm.sender_id IS NULL OR cm.sender_id <> ${userId})
        ) as unread_count
      FROM chats c
      JOIN chat_participants p ON p.chat_id = c.id AND p.user_id = ${userId}
      LEFT JOIN LATERAL (
        SELECT id, sender_id, text, created_at, trip_id
        FROM chat_messages cm
        WHERE cm.chat_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lm ON true
      LEFT JOIN chat_participants op ON op.chat_id = c.id AND op.user_id <> ${userId}
      LEFT JOIN users other_u ON other_u.id = op.user_id
      LEFT JOIN trips t ON t.id = c.trip_id
    `;

        const result = await db.execute(query);
        const rows: any[] = Array.isArray(result)
            ? (result as any[])
            : ((result as any).rows ?? []);

        return rows.map((row) => this.mapConversationRow(row));
    }

    async getConversationBuckets(userId: string): Promise<ChatConversationBuckets> {
        const conversations = await this.getConversations(userId);
        return this.bucketizeConversations(conversations);
    }

    async getMessages(
        userId: string,
        otherUserId: string,
        tripId?: string | null,
    ): Promise<MessageWithUsers[]> {
        const chatId = await this.findChatIdForContext({ userId, otherUserId, tripId });
        if (!chatId) return [];

        const rows = await db
            .select({
                id: chatMessages.id,
                chatId: chatMessages.chatId,
                senderId: chatMessages.senderId,
                text: chatMessages.text,
                type: chatMessages.type,
                tripId: chatMessages.tripId,
                createdAt: chatMessages.createdAt,
                senderName: users.name,
                senderAvatarUrl: users.avatarUrl,
                senderAvatarThumbnailUrl: users.avatarThumbnailUrl,
            })
            .from(chatMessages)
            .leftJoin(users, eq(chatMessages.senderId, users.id))
            .where(eq(chatMessages.chatId, chatId))
            .orderBy(asc(chatMessages.createdAt));

        return rows.map((row) => ({
            id: row.id,
            chatId: row.chatId,
            senderId: row.senderId,
            text: row.text,
            type: row.type,
            tripId: row.tripId ?? null,
            createdAt: row.createdAt,
            sender: row.senderId
                ? {
                    id: row.senderId,
                    name: row.senderName ?? "System",
                    avatarUrl: row.senderAvatarUrl,
                    avatarThumbnailUrl: row.senderAvatarThumbnailUrl,
                }
                : null,
        }));
    }

    async sendMessage(
        message: InsertMessage & {
            senderId: string;
            tripId?: string | null;
            chatId?: string | null;
            type?: string;
        },
    ): Promise<MessageWithUsers> {
        const {
            senderId,
            receiverId,
            text,
            tripId = null,
            chatId: explicitChatId = null,
            type: messageType = "general",
        } = message;

        if (!text) {
            throw new Error("Message text is required");
        }

        let targetChatId = explicitChatId ?? null;

        if (targetChatId) {
            const membership = await db
                .select({ id: chatParticipants.id })
                .from(chatParticipants)
                .where(
                    and(
                        eq(chatParticipants.chatId, targetChatId),
                        eq(chatParticipants.userId, senderId),
                    ),
                )
                .limit(1);

            if (membership.length === 0) {
                throw new Error("Not a participant of this chat");
            }
        } else {
            if (!receiverId) {
                throw new Error("receiverId is required when chatId is absent");
            }

            const existingChatId = await this.findChatIdForContext({
                userId: senderId,
                otherUserId: receiverId,
                tripId,
            });

            if (existingChatId) {
                targetChatId = existingChatId;
            } else {
                const [newChat] = await db
                    .insert(chats)
                    .values({
                        type: "private",
                        status: "active",
                    })
                    .returning();
                targetChatId = newChat.id;

                await db.insert(chatParticipants).values([
                    { chatId: targetChatId, userId: senderId },
                    { chatId: targetChatId, userId: receiverId },
                ]);
            }
        }

        const [newMessage] = await db
            .insert(chatMessages)
            .values({
                chatId: targetChatId!,
                senderId,
                text,
                type: messageType,
                tripId,
            })
            .returning();

        const [sender] = await db
            .select()
            .from(users)
            .where(eq(users.id, senderId));

        return {
            ...newMessage,
            sender: {
                id: sender.id,
                name: sender.name,
                avatarUrl: sender.avatarUrl,
                avatarThumbnailUrl: sender.avatarThumbnailUrl,
            },
        };
    }

    async markMessagesAsRead(
        userId: string,
        otherUserId: string,
        tripId?: string | null,
    ): Promise<void> {
        const chatId = await this.findChatIdForContext({ userId, otherUserId, tripId });
        if (chatId) {
            await db
                .update(chatParticipants)
                .set({ lastReadAt: sql`now()` })
                .where(and(eq(chatParticipants.chatId, chatId), eq(chatParticipants.userId, userId)));
        }
    }

    private mapConversationRow(row: any): ChatConversation {
        return {
            chatId: row.chat_id,
            chatType: row.chat_type,
            chatStatus: row.chat_status,
            tripId: row.trip_id,
            tripTitle: row.trip_title,
            tripPhoto: row.trip_photo,
            otherUserId: row.other_user_id,
            otherUserName: row.other_user_name,
            otherUserAvatarUrl: row.avatar_url,
            otherUserAvatarThumbnailUrl: row.avatar_thumbnail_url,
            lastMessage: row.last_msg_id
                ? {
                    id: row.last_msg_id,
                    senderId: row.last_msg_sender_id,
                    text: row.last_msg_text,
                    createdAt: new Date(row.last_msg_created),
                    tripId: row.last_msg_trip_id,
                }
                : null,
            unreadCount: Number(row.unread_count) || 0,
        };
    }

    private bucketizeConversations(
        conversations: ChatConversation[],
    ): ChatConversationBuckets {
        const buckets: ChatConversationBuckets = {
            requested: [],
            private: [],
            public: [],
            archived: [],
        };

        // Use a Map to deduplicate conversations by chatId
        const uniqueConversations = new Map<string, ChatConversation>();
        conversations.forEach((c) => {
            if (!uniqueConversations.has(c.chatId)) {
                uniqueConversations.set(c.chatId, c);
            }
        });

        for (const conv of uniqueConversations.values()) {
            if (conv.chatStatus === "archived") {
                buckets.archived.push(conv);
            } else if (conv.chatStatus === "requested") {
                buckets.requested.push(conv);
            } else if (conv.chatType === "public") {
                buckets.public.push(conv);
            } else {
                buckets.private.push(conv);
            }
        }

        return buckets;
    }

    private async findChatIdForContext(ctx: {
        userId: string;
        otherUserId: string;
        tripId?: string | null;
    }): Promise<string | null> {
        const result = await db.execute<{ id: string }>(sql`
      SELECT c.id FROM chats c
      JOIN chat_participants p1 ON p1.chat_id = c.id AND p1.user_id = ${ctx.userId}
      JOIN chat_participants p2 ON p2.chat_id = c.id AND p2.user_id = ${ctx.otherUserId}
      WHERE c.type = 'private'
      LIMIT 1
    `);

        const rows: { id: string }[] = Array.isArray(result)
            ? (result as any[])
            : ((result as any).rows ?? []);

        return rows.length > 0 ? rows[0].id : null;
    }
}
