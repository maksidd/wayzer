import {
  type User,
  type InsertUser,
  type Trip,
  type InsertTrip,
  type Comment,
  type InsertComment,
  type InsertMessage,
  type TripType,
  type TripWithDetails,
  type CommentWithUser,
  type MessageWithUsers,
  type ChatConversation,
  type ChatConversationBuckets,
  type TripFilters,
  type UserProfile,
  type UpdateUserProfile,
} from "@shared/schema";
import { UserRepository } from "./repositories/user-repository";
import { TripRepository } from "./repositories/trip-repository";
import { MessageRepository } from "./repositories/message-repository";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserProfile(id: string): Promise<UserProfile | undefined>;
  updateUserProfile(
    id: string,
    data: UpdateUserProfile,
  ): Promise<UserProfile | undefined>;
  getAllUsers(): Promise<Pick<User, "id" | "name" | "email" | "role" | "status">[]>;
  updateUserStatus(userId: string, status: "active" | "blocked"): Promise<void>;
  deleteUserCascade(userId: string): Promise<void>;

  // Trip operations
  getTrips(filters?: TripFilters): Promise<TripWithDetails[]>;
  getTripById(id: string): Promise<TripWithDetails | undefined>;
  createTrip(trip: InsertTrip, creatorId: string): Promise<Trip>;

  // Trip participants
  joinTrip(tripId: string, userId: string): Promise<void>;
  leaveTrip(tripId: string, userId: string): Promise<void>;
  getTripParticipants(tripId: string): Promise<UserProfile[]>;
  isUserParticipant(tripId: string, userId: string): Promise<boolean>;
  getUserTripStatus(tripId: string, userId: string): Promise<string | null>; // pending, approved, rejected

  // Comments
  getTripComments(tripId: string): Promise<CommentWithUser[]>;
  createComment(
    comment: InsertComment & { tripId: string; userId: string },
  ): Promise<Comment>;

  // Trip types
  getTripTypes(): Promise<TripType[]>;

  // Messages
  getConversations(userId: string): Promise<ChatConversation[]>;
  getConversationBuckets(userId: string): Promise<ChatConversationBuckets>;
  getMessages(
    userId: string,
    otherUserId: string,
    tripId?: string | null,
  ): Promise<MessageWithUsers[]>;
  sendMessage(
    message: InsertMessage & {
      senderId: string;
      tripId?: string | null;
      chatId?: string | null;
      type?: string;
    },
  ): Promise<MessageWithUsers>;
  markMessagesAsRead(
    userId: string,
    otherUserId: string,
    tripId?: string | null,
  ): Promise<void>;

  // Initialize data
  initializeTripTypes(): Promise<void>;

  joinTripAsApproved(tripId: string, userId: string): Promise<void>;

  // Favorites
  addToFavorites(tripId: string, userId: string): Promise<void>;
  removeFromFavorites(tripId: string, userId: string): Promise<void>;
  getUserFavorites(userId: string): Promise<TripWithDetails[]>;
  isFavorite(tripId: string, userId: string): Promise<boolean>;

  // Trip requests
  acceptTripRequest(tripId: string, userId: string): Promise<void>;
  rejectTripRequest(tripId: string, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private userRepo: UserRepository;
  private tripRepo: TripRepository;
  private messageRepo: MessageRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.tripRepo = new TripRepository();
    this.messageRepo = new MessageRepository();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.userRepo.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.userRepo.getUserByEmail(email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return this.userRepo.createUser(insertUser);
  }

  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    return this.userRepo.getUserProfile(id);
  }

  async updateUserProfile(
    id: string,
    data: UpdateUserProfile,
  ): Promise<UserProfile | undefined> {
    return this.userRepo.updateUserProfile(id, data);
  }

  async getAllUsers(): Promise<Pick<User, "id" | "name" | "email" | "role" | "status">[]> {
    return this.userRepo.getAllUsers();
  }

  async updateUserStatus(userId: string, status: "active" | "blocked"): Promise<void> {
    return this.userRepo.updateUserStatus(userId, status);
  }

  async deleteUserCascade(userId: string): Promise<void> {
    return this.userRepo.deleteUserCascade(userId);
  }

  // Trip operations
  async getTrips(filters?: TripFilters): Promise<TripWithDetails[]> {
    return this.tripRepo.getTrips(filters);
  }

  async getTripById(id: string): Promise<TripWithDetails | undefined> {
    return this.tripRepo.getTripById(id);
  }

  async createTrip(trip: InsertTrip, creatorId: string): Promise<Trip> {
    return this.tripRepo.createTrip(trip, creatorId);
  }

  // Trip participants
  async joinTrip(tripId: string, userId: string): Promise<void> {
    return this.tripRepo.joinTrip(tripId, userId);
  }

  async leaveTrip(tripId: string, userId: string): Promise<void> {
    return this.tripRepo.leaveTrip(tripId, userId);
  }

  async getTripParticipants(tripId: string): Promise<UserProfile[]> {
    return this.tripRepo.getTripParticipants(tripId);
  }

  async isUserParticipant(tripId: string, userId: string): Promise<boolean> {
    return this.tripRepo.isUserParticipant(tripId, userId);
  }

  async getUserTripStatus(tripId: string, userId: string): Promise<string | null> {
    return this.tripRepo.getUserTripStatus(tripId, userId);
  }

  // Comments
  async getTripComments(tripId: string): Promise<CommentWithUser[]> {
    return this.tripRepo.getTripComments(tripId);
  }

  async createComment(
    comment: InsertComment & { tripId: string; userId: string },
  ): Promise<Comment> {
    return this.tripRepo.createComment(comment);
  }

  // Trip types
  async getTripTypes(): Promise<TripType[]> {
    return this.tripRepo.getTripTypes();
  }

  // Messages
  async getConversations(userId: string): Promise<ChatConversation[]> {
    return this.messageRepo.getConversations(userId);
  }

  async getConversationBuckets(userId: string): Promise<ChatConversationBuckets> {
    return this.messageRepo.getConversationBuckets(userId);
  }

  async getMessages(
    userId: string,
    otherUserId: string,
    tripId?: string | null,
  ): Promise<MessageWithUsers[]> {
    return this.messageRepo.getMessages(userId, otherUserId, tripId);
  }

  async sendMessage(
    message: InsertMessage & {
      senderId: string;
      tripId?: string | null;
      chatId?: string | null;
      type?: string;
    },
  ): Promise<MessageWithUsers> {
    return this.messageRepo.sendMessage(message);
  }

  async markMessagesAsRead(
    userId: string,
    otherUserId: string,
    tripId?: string | null,
  ): Promise<void> {
    return this.messageRepo.markMessagesAsRead(userId, otherUserId, tripId);
  }

  // Initialize data
  async initializeTripTypes(): Promise<void> {
    return this.tripRepo.initializeTripTypes();
  }

  async joinTripAsApproved(tripId: string, userId: string): Promise<void> {
    return this.tripRepo.joinTripAsApproved(tripId, userId);
  }

  // Favorites
  async addToFavorites(tripId: string, userId: string): Promise<void> {
    return this.tripRepo.addToFavorites(tripId, userId);
  }

  async removeFromFavorites(tripId: string, userId: string): Promise<void> {
    return this.tripRepo.removeFromFavorites(tripId, userId);
  }

  async getUserFavorites(userId: string): Promise<TripWithDetails[]> {
    return this.tripRepo.getUserFavorites(userId);
  }

  async isFavorite(tripId: string, userId: string): Promise<boolean> {
    return this.tripRepo.isFavorite(tripId, userId);
  }

  // Trip requests
  async acceptTripRequest(tripId: string, userId: string): Promise<void> {
    return this.tripRepo.acceptTripRequest(tripId, userId);
  }

  async rejectTripRequest(tripId: string, userId: string): Promise<void> {
    return this.tripRepo.rejectTripRequest(tripId, userId);
  }
}

export const storage = new DatabaseStorage();
