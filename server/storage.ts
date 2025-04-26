import { 
  users, type User, type InsertUser, 
  routes, type Route, type InsertRoute,
  routeMembers, type RouteMember, type InsertRouteMember,
  messages, type Message, type InsertMessage,
  reviews, type Review, type InsertReview
} from "@shared/schema";
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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private routes: Map<number, Route>;
  private routeMembers: Map<string, RouteMember>;
  private messages: Map<number, Message>;
  private reviews: Map<number, Review>;
  
  userId: number;
  routeId: number;
  messageId: number;
  reviewId: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.routes = new Map();
    this.routeMembers = new Map();
    this.messages = new Map();
    this.reviews = new Map();
    
    this.userId = 1;
    this.routeId = 1;
    this.messageId = 1;
    this.reviewId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id, verified: false, rating: 0, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Route methods
  async getRoute(id: number): Promise<Route | undefined> {
    return this.routes.get(id);
  }

  async getAllRoutes(): Promise<Route[]> {
    return Array.from(this.routes.values());
  }

  async getRoutesByType(routeType: string): Promise<Route[]> {
    return Array.from(this.routes.values()).filter(
      (route) => route.routeType === routeType
    );
  }

  async getRoutesByDateRange(startDate: Date, endDate: Date): Promise<Route[]> {
    return Array.from(this.routes.values()).filter(
      (route) => {
        const routeDate = new Date(route.date);
        return routeDate >= startDate && routeDate <= endDate;
      }
    );
  }

  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    const id = this.routeId++;
    const route: Route = { ...insertRoute, id, createdAt: new Date() };
    this.routes.set(id, route);
    return route;
  }

  async updateRoute(id: number, routeData: Partial<Route>): Promise<Route | undefined> {
    const route = this.routes.get(id);
    if (!route) return undefined;
    
    const updatedRoute = { ...route, ...routeData };
    this.routes.set(id, updatedRoute);
    return updatedRoute;
  }

  async deleteRoute(id: number): Promise<boolean> {
    return this.routes.delete(id);
  }

  // Route members methods
  async getRouteMembers(routeId: number): Promise<RouteMember[]> {
    return Array.from(this.routeMembers.values()).filter(
      (member) => member.routeId === routeId
    );
  }

  async addRouteMember(member: InsertRouteMember): Promise<RouteMember> {
    const key = `${member.routeId}-${member.userId}`;
    const routeMember: RouteMember = { 
      ...member,
      joinedAt: new Date()
    };
    this.routeMembers.set(key, routeMember);
    return routeMember;
  }

  async updateRouteMemberStatus(routeId: number, userId: number, status: string): Promise<RouteMember | undefined> {
    const key = `${routeId}-${userId}`;
    const member = this.routeMembers.get(key);
    if (!member) return undefined;
    
    const updatedMember = { ...member, status };
    this.routeMembers.set(key, updatedMember);
    return updatedMember;
  }

  async removeRouteMember(routeId: number, userId: number): Promise<boolean> {
    const key = `${routeId}-${userId}`;
    return this.routeMembers.delete(key);
  }

  async getParticipantCount(routeId: number): Promise<number> {
    return Array.from(this.routeMembers.values()).filter(
      (member) => member.routeId === routeId && member.status === 'accepted'
    ).length;
  }

  // Message methods
  async getMessages(routeId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((message) => message.routeId === routeId)
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageId++;
    const message: Message = { ...insertMessage, id, sentAt: new Date() };
    this.messages.set(id, message);
    return message;
  }

  // Review methods
  async getReviews(userId: number): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(
      (review) => review.targetId === userId
    );
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = this.reviewId++;
    const review: Review = { ...insertReview, id, createdAt: new Date() };
    this.reviews.set(id, review);
    
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

export const storage = new MemStorage();
