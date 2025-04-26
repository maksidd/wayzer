import { 
  users, type User, type InsertUser, 
  routes, type Route, type InsertRoute,
  routeMembers, type RouteMember, type InsertRouteMember,
  messages, type Message, type InsertMessage,
  reviews, type Review, type InsertReview
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, count, asc } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface for storage methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  
  // Route methods
  getRoute(id: number): Promise<Route | undefined>;
  getAllRoutes(): Promise<Route[]>;
  getRoutesByType(routeType: string): Promise<Route[]>;
  getRoutesByDateRange(startDate: Date, endDate: Date): Promise<Route[]>;
  createRoute(route: InsertRoute): Promise<Route>;
  updateRoute(id: number, route: Partial<Route>): Promise<Route | undefined>;
  deleteRoute(id: number): Promise<boolean>;
  
  // Route members methods
  getRouteMembers(routeId: number): Promise<RouteMember[]>;
  addRouteMember(member: InsertRouteMember): Promise<RouteMember>;
  updateRouteMemberStatus(routeId: number, userId: number, status: string): Promise<RouteMember | undefined>;
  removeRouteMember(routeId: number, userId: number): Promise<boolean>;
  getParticipantCount(routeId: number): Promise<number>;
  
  // Message methods
  getMessages(routeId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Review methods
  getReviews(userId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  getUserRating(userId: number): Promise<number>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users)
      .values({
        ...insertUser,
        verified: false,
        rating: 0
      })
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Route methods
  async getRoute(id: number): Promise<Route | undefined> {
    const [route] = await db.select().from(routes).where(eq(routes.id, id));
    return route;
  }

  async getAllRoutes(): Promise<Route[]> {
    return db.select().from(routes);
  }

  async getRoutesByType(routeType: string): Promise<Route[]> {
    return db.select().from(routes).where(eq(routes.routeType, routeType));
  }

  async getRoutesByDateRange(startDate: Date, endDate: Date): Promise<Route[]> {
    return db.select().from(routes)
      .where(
        and(
          gte(routes.date, startDate),
          lte(routes.date, endDate)
        )
      );
  }

  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    const [route] = await db.insert(routes)
      .values(insertRoute)
      .returning();
    return route;
  }

  async updateRoute(id: number, routeData: Partial<Route>): Promise<Route | undefined> {
    const [updatedRoute] = await db.update(routes)
      .set(routeData)
      .where(eq(routes.id, id))
      .returning();
    return updatedRoute;
  }

  async deleteRoute(id: number): Promise<boolean> {
    const result = await db.delete(routes).where(eq(routes.id, id));
    return result.count > 0;
  }

  // Route members methods
  async getRouteMembers(routeId: number): Promise<RouteMember[]> {
    return db.select().from(routeMembers).where(eq(routeMembers.routeId, routeId));
  }

  async addRouteMember(member: InsertRouteMember): Promise<RouteMember> {
    const [routeMember] = await db.insert(routeMembers)
      .values(member)
      .returning();
    return routeMember;
  }

  async updateRouteMemberStatus(routeId: number, userId: number, status: string): Promise<RouteMember | undefined> {
    const [updatedMember] = await db.update(routeMembers)
      .set({ status })
      .where(
        and(
          eq(routeMembers.routeId, routeId),
          eq(routeMembers.userId, userId)
        )
      )
      .returning();
    return updatedMember;
  }

  async removeRouteMember(routeId: number, userId: number): Promise<boolean> {
    const result = await db.delete(routeMembers)
      .where(
        and(
          eq(routeMembers.routeId, routeId),
          eq(routeMembers.userId, userId)
        )
      );
    return result.count > 0;
  }

  async getParticipantCount(routeId: number): Promise<number> {
    const result = await db.select({ count: count() }).from(routeMembers)
      .where(
        and(
          eq(routeMembers.routeId, routeId),
          eq(routeMembers.status, 'accepted')
        )
      );
    return result[0]?.count || 0;
  }

  // Message methods
  async getMessages(routeId: number): Promise<Message[]> {
    return db.select().from(messages)
      .where(eq(messages.routeId, routeId))
      .orderBy(asc(messages.sentAt));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  // Review methods
  async getReviews(userId: number): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.targetId, userId));
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews)
      .values(insertReview)
      .returning();
    
    // Update user rating
    await this.updateUserRating(insertReview.targetId);
    
    return review;
  }

  async getUserRating(userId: number): Promise<number> {
    const reviews = await this.getReviews(userId);
    if (reviews.length === 0) return 0;
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return Math.round((totalRating / reviews.length) * 10) / 10; // Round to 1 decimal place
  }

  private async updateUserRating(userId: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;
    
    const rating = await this.getUserRating(userId);
    await this.updateUser(userId, { rating });
  }
}

export const storage = new DatabaseStorage();
