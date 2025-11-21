import {
  pgTable,
  text,
  serial,
  timestamp,
  uuid,
  integer,
  decimal,
  boolean,
  jsonb,
  varchar,
  index,
  date,
  time,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for sessions)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  avatarUrl: text("avatar_url"),
  avatarThumbnailUrl: text("avatar_thumbnail_url"),
  age: integer("age"),
  city: text("city"),
  phone: text("phone"),
  bio: text("bio"),
  languages: text("languages").array(),
  additionalPhotos: text("additional_photos").array(),
  role: text("role").notNull().default("user"),
  messengers: jsonb("messengers").$type<Record<string, string>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  gender: text("gender"),
});

// Trip types table
export const tripTypes = pgTable("trip_types", {
  id: text("id").primaryKey(),
  ordering: integer("ordering").default(0),
});

// Trips table
export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type")
    .notNull()
    .references(() => tripTypes.id),
  city: text("city").notNull(),
  location: jsonb("location").notNull().$type<{ lat: number; lng: number }>(),
  route: jsonb("route").$type<{ lat: number; lng: number }[]>(),
  date: date("date"),
  time: time("time"),
  maxParticipants: integer("max_participants").notNull(),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => users.id),
  mainPhotoUrl: text("main_photo_url"),
  additionalPhotos: text("additional_photos").array(),
  participantGender: text("participant_gender").notNull().default("any"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trip participants table
export const tripParticipants = pgTable("trip_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Comments table
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  receiverId: uuid("receiver_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tripId: uuid("trip_id").references(() => trips.id),
  text: text("text").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Favorites table
export const favorites = pgTable("favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Group messages table (chat per trip)
export const groupMessages = pgTable("group_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ================= NEW CHAT STRUCTURE =================

// Chats (dialogues / group chats)
export const chats = pgTable("chats", {
  id: uuid("id").primaryKey().defaultRandom(),
  // private – 1-on-1 dialog, public – group (trip)
  type: text("type").$type<"private" | "public">().notNull(),
  tripId: uuid("trip_id").references(() => trips.id, { onDelete: "cascade" }),
  // requested – created, awaiting confirmation; archived – closed/archived
  status: text("status")
    .$type<"archived" | "requested" | "active">()
    .default("requested"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Participants of a chat
export const chatParticipants = pgTable("chat_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow(),
  lastReadAt: timestamp("last_read_at"),
  role: text("role").$type<"owner" | "admin" | "member">().default("member"),
});

// Messages inside chat
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").references(() => users.id, {
    onDelete: "cascade",
  }), // null for system messages
  text: text("text").notNull(),
  // Message type/label. Added 'request' for trip applications
  type: text("type")
    .$type<"red" | "green" | "yellow" | "general" | "request">()
    .default("general"),
  tripId: uuid("trip_id").references(() => trips.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for new chat structure
export const chatsRelations = relations(chats, ({ many, one }) => ({
  participants: many(chatParticipants),
  messages: many(chatMessages),
  trip: one(trips, {
    fields: [chats.tripId],
    references: [trips.id],
  }),
}));

export const chatParticipantsRelations = relations(
  chatParticipants,
  ({ one }) => ({
    chat: one(chats, {
      fields: [chatParticipants.chatId],
      references: [chats.id],
    }),
    user: one(users, {
      fields: [chatParticipants.userId],
      references: [users.id],
    }),
  }),
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  chat: one(chats, {
    fields: [chatMessages.chatId],
    references: [chats.id],
  }),
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id],
  }),
  trip: one(trips, {
    fields: [chatMessages.tripId],
    references: [trips.id],
  }),
}));

// ----------------- Types -----------------

export type Chat = typeof chats.$inferSelect;
export type InsertChat = typeof chats.$inferInsert;

export type ChatParticipant = typeof chatParticipants.$inferSelect;
export type InsertChatParticipant = typeof chatParticipants.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
// =====================================================

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  trips: many(trips),
  tripParticipants: many(tripParticipants),
  comments: many(comments),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
  favorites: many(favorites),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  creator: one(users, {
    fields: [trips.creatorId],
    references: [users.id],
  }),
  type: one(tripTypes, {
    fields: [trips.type],
    references: [tripTypes.id],
  }),
  participants: many(tripParticipants),
  comments: many(comments),
  favorites: many(favorites),
}));

export const tripParticipantsRelations = relations(
  tripParticipants,
  ({ one }) => ({
    trip: one(trips, {
      fields: [tripParticipants.tripId],
      references: [trips.id],
    }),
    user: one(users, {
      fields: [tripParticipants.userId],
      references: [users.id],
    }),
  }),
);

export const commentsRelations = relations(comments, ({ one }) => ({
  trip: one(trips, {
    fields: [comments.tripId],
    references: [trips.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const tripTypesRelations = relations(tripTypes, ({ many }) => ({
  trips: many(trips),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  trip: one(trips, {
    fields: [favorites.tripId],
    references: [trips.id],
  }),
}));

export const groupMessagesRelations = relations(groupMessages, ({ one }) => ({
  sender: one(users, {
    fields: [groupMessages.senderId],
    references: [users.id],
  }),
  trip: one(trips, {
    fields: [groupMessages.tripId],
    references: [trips.id],
  }),
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    avatarUrl: true,
    avatarThumbnailUrl: true,
  })
  .extend({
    role: z.enum(["user", "admin"]).optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
  });

export const updateUserProfileSchema = z.object({
  name: z.string().min(1).optional(),
  age: z.number().int().min(1).max(120).optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  languages: z.array(z.string()).optional(),
  additionalPhotos: z.array(z.string().url()).optional(),
  messengers: z.record(z.string()).optional(),
  avatarUrl: z.string().optional(),
  avatarThumbnailUrl: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  // Note: email is intentionally excluded from updates for security
});

export const selectUserSchema = createSelectSchema(users);

export const insertTripSchema = createInsertSchema(trips)
  .omit({
    id: true,
    creatorId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    location: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
    route: z
      .array(
        z.object({
          lat: z.number(),
          lng: z.number(),
        }),
      )
      .optional(),
    date: z.string().optional().nullable(),
    time: z.string().optional().nullable(),
    creatorParticipates: z.boolean().default(true),
    title: z.string().min(1, "Route title is required"),
    city: z.string().min(1, "City is required"),
    description: z.string().min(1, "Description is required"),
    participantGender: z.enum(["any", "male", "female"]).default("any"),
  });

export const selectTripSchema = createSelectSchema(trips);

export const insertCommentSchema = z.object({
  text: z.string().min(1, "Comment text is required"),
});

export const selectCommentSchema = createSelectSchema(comments);

export const insertMessageSchema = z.object({
  receiverId: z.string().uuid("Invalid receiver ID"),
  text: z.string().min(1, "Message text is required"),
  tripId: z.string().uuid("Invalid trip ID").optional(),
});

export const selectMessageSchema = createSelectSchema(messages);

// Auth schemas
export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

// Trip filter schema
export const tripFiltersSchema = z.object({
  city: z.string().optional(),
  type: z.string().optional(),
  date_from: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
    .optional(),
  date_to: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
    .optional(),
  limit: z.preprocess(
    (v) => (v === undefined ? undefined : Number(v)),
    z.number().int().min(1).optional(),
  ),
  offset: z.preprocess(
    (v) => (v === undefined ? undefined : Number(v)),
    z.number().int().min(0).optional(),
  ),
  creatorId: z.string().uuid().optional(),
});

// Types
export type User = typeof users.$inferSelect & { role: string };
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type TripType = typeof tripTypes.$inferSelect;
export type TripParticipant = typeof tripParticipants.$inferSelect;
export type InsertTripParticipant = typeof tripParticipants.$inferInsert;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;
export type GroupMessage = typeof groupMessages.$inferSelect;

export type RegisterData = z.infer<typeof registerSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type TripFilters = z.infer<typeof tripFiltersSchema>;

// Extended types for API responses
export type TripWithDetails = Trip & {
  creator: Pick<
    User,
    | "id"
    | "name"
    | "email"
    | "age"
    | "bio"
    | "city"
    | "phone"
    | "languages"
    | "messengers"
    | "avatarUrl"
    | "avatarThumbnailUrl"
    | "additionalPhotos"
  >;
  participantsCount: number;
};

export type CommentWithUser = Comment & {
  user: Pick<User, "id" | "name">;
};

export type MessageWithUsers = {
  id: string;
  chatId: string;
  senderId: string | null;
  text: string;
  type: ChatMessage["type"];
  tripId: string | null;
  createdAt: Date | string | null;
  sender: Pick<User, "id" | "name" | "avatarUrl" | "avatarThumbnailUrl"> | null;
};

export type ChatConversationSource =
  | {
      type: "private";
      chatId: string;
      otherUserId: string | null;
      name: string | null;
      avatarUrl: string | null;
      avatarThumbnailUrl: string | null;
    }
  | {
      type: "public";
      chatId: string;
      tripId: string | null;
      name: string | null;
      photoUrl: string | null;
    };

export type ChatConversation = {
  chatId: string;
  type: "private" | "public";
  status: "archived" | "requested" | "active";
  source: ChatConversationSource;
  lastMessage: {
    id: string;
    senderId: string | null;
    tripId: string | null;
    text: string | null;
    createdAt: Date | string | null;
  } | null;
  unreadCount: number;
};

export type ChatConversationBuckets = {
  requested: ChatConversation[];
  private: ChatConversation[];
  public: ChatConversation[];
  archived: ChatConversation[];
};

export type UserProfile = Omit<User, "password">;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
