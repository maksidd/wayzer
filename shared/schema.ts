import { pgTable, text, serial, integer, boolean, timestamp, json, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  avatar: text("avatar"),
  age: integer("age"),
  interests: text("interests").array(),
  bio: text("bio"),
  verified: boolean("verified").default(false),
  rating: integer("rating").default(0),
  createdAt: timestamp("created_at").defaultNow()
});

// Routes/trips table
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  routeType: text("route_type").notNull(), // auto, bike, hike, etc.
  startPoint: text("start_point").notNull(),
  endPoint: text("end_point").notNull(),
  startLat: text("start_lat").notNull(),
  startLng: text("start_lng").notNull(),
  endLat: text("end_lat").notNull(),
  endLng: text("end_lng").notNull(),
  date: timestamp("date").notNull(),
  maxParticipants: integer("max_participants").notNull(),
  purpose: text("purpose").notNull(), // tourism, friends, romance, company
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow()
});

// Route participants
export const routeMembers = pgTable("route_members", {
  routeId: integer("route_id").notNull().references(() => routes.id),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  joinedAt: timestamp("joined_at").defaultNow()
}, (t) => ({
  pk: primaryKey({ columns: [t.routeId, t.userId] })
}));

// Chat messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull().references(() => routes.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow()
});

// Reviews and ratings
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull().references(() => users.id),
  targetId: integer("target_id").notNull().references(() => users.id),
  routeId: integer("route_id").notNull().references(() => routes.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow()
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, verified: true, rating: true, createdAt: true })
  .extend({
    confirmPassword: z.string()
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  });

export const loginUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export const insertRouteSchema = createInsertSchema(routes).omit({ 
  id: true, 
  createdAt: true 
});

export const insertRouteMemberSchema = createInsertSchema(routeMembers).omit({
  joinedAt: true
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  sentAt: true
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Route = typeof routes.$inferSelect;

export type InsertRouteMember = z.infer<typeof insertRouteMemberSchema>;
export type RouteMember = typeof routeMembers.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// Basic route types enum (for frontend usage)
export enum RouteTypes {
  ROAD_TRIP = "road_trip",
  HIKING = "hiking",
  BIKING = "biking",
  CAMPING = "camping",
  CITY_TOUR = "city_tour",
  BEACH = "beach",
  TRAIN = "train",
  FESTIVAL = "festival",
  FOOD = "food",
  MOUNTAIN = "mountain"
}

// Purpose types enum (for frontend usage)
export enum PurposeTypes {
  TOURISM = "tourism",
  FRIENDS = "friends",
  ROMANCE = "romance",
  COMPANY = "company"
}
