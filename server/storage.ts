import {
  users,
  trips,
  tripParticipants,
  comments,
  tripTypes,
  favorites,
  chats,
  chatParticipants,
  chatMessages,
  type User,
  type InsertUser,
  type Trip,
  type InsertTrip,
  type Comment,
  type InsertComment,
  type Message,
  type InsertMessage,
  type TripType,
  type TripParticipant,
  type TripWithDetails,
  type CommentWithUser,
  type MessageWithUsers,
  type ChatConversation,
  type TripFilters,
  type UserProfile,
  type UpdateUserProfile,
  type Favorite,
  type InsertFavorite,
} from "@shared/schema";
import { db } from "./db";
import {
  eq,
  and,
  or,
  gte,
  lte,
  desc,
  count,
  sql,
  inArray,
  asc,
} from "drizzle-orm";

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
  getAllUsers(): Promise<Pick<User, "id" | "name" | "email" | "role">[]>;
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
  getMessages(
    userId: string,
    otherUserId: string,
    tripId?: string | null,
  ): Promise<MessageWithUsers[]>;
  sendMessage(
    message: InsertMessage & { senderId: string; tripId?: string | null },
  ): Promise<Message>;
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
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        avatarThumbnailUrl: users.avatarThumbnailUrl,
        age: users.age,
        city: users.city,
        phone: users.phone,
        bio: users.bio,
        languages: users.languages,
        additionalPhotos: users.additionalPhotos,
        messengers: users.messengers,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        role: users.role,
        gender: users.gender,
      })
      .from(users)
      .where(eq(users.id, id));
    return user || undefined;
  }

  async updateUserProfile(
    id: string,
    data: UpdateUserProfile,
  ): Promise<UserProfile | undefined> {
    // Explicitly exclude email from any updates for security
    const { email, ...allowedUpdates } = data as any;

    const updateData: any = {
      ...allowedUpdates,
      updatedAt: new Date(),
    };

    await db.update(users).set(updateData).where(eq(users.id, id));

    return this.getUserProfile(id);
  }

  async getAllUsers(): Promise<Pick<User, "id" | "name" | "email" | "role">[]> {
    const usersData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users);
    return usersData.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
    }));
  }

  async deleteUserCascade(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // 1) Collect their routes
      const ownTripsRows = await tx
        .select({ id: trips.id })
        .from(trips)
        .where(eq(trips.creatorId, userId));
      const ownTripIds = ownTripsRows.map((r) => r.id);

      // 2) Clean dependent tables
      if (ownTripIds.length > 0) {
        await tx
          .delete(tripParticipants)
          .where(inArray(tripParticipants.tripId, ownTripIds));
        await tx.delete(comments).where(inArray(comments.tripId, ownTripIds));
        await tx.delete(favorites).where(inArray(favorites.tripId, ownTripIds));
        await tx.delete(messages).where(inArray(messages.tripId, ownTripIds));
      }

      // 3) Remove user participation in others' trips
      await tx
        .delete(tripParticipants)
        .where(eq(tripParticipants.userId, userId));

      // 4) Remove own trips
      if (ownTripIds.length > 0) {
        await tx.delete(trips).where(inArray(trips.id, ownTripIds));
      }

      // 5) Remove user favorites/comments/messages
      await tx.delete(favorites).where(eq(favorites.userId, userId));
      await tx.delete(comments).where(eq(comments.userId, userId));
      await tx
        .delete(messages)
        .where(
          or(eq(messages.senderId, userId), eq(messages.receiverId, userId)),
        );

      // 6) Finally remove user
      await tx.delete(users).where(eq(users.id, userId));
    });
  }

  async getTrips(filters?: TripFilters): Promise<TripWithDetails[]> {
    let query = db
      .select({
        id: trips.id,
        title: trips.title,
        description: trips.description,
        type: trips.type,
        city: trips.city,
        location: trips.location,
        route: trips.route,
        date: trips.date,
        time: trips.time,
        maxParticipants: trips.maxParticipants,
        creatorId: trips.creatorId,
        mainPhotoUrl: trips.mainPhotoUrl,
        additionalPhotos: trips.additionalPhotos,
        createdAt: trips.createdAt,
        updatedAt: trips.updatedAt,
        creatorName: users.name,
        creatorEmail: users.email,
        creatorAge: users.age,
        creatorBio: users.bio,
        creatorCity: users.city,
        creatorPhone: users.phone,
        creatorLanguages: users.languages,
        creatorMessengers: users.messengers,
        creatorAvatarUrl: users.avatarUrl,
        creatorAvatarThumbnailUrl: users.avatarThumbnailUrl,
        creatorAdditionalPhotos: users.additionalPhotos,
        participantsCount: sql<number>`cast(count(case when ${tripParticipants.status} = 'approved' then 1 end) as integer)`,
        favoritesCount: sql<number>`cast(count(distinct case when ${favorites.tripId} is not null then ${favorites.userId} end) as integer)`,
      })
      .from(trips)
      .innerJoin(users, eq(trips.creatorId, users.id))
      .leftJoin(tripParticipants, eq(trips.id, tripParticipants.tripId))
      .leftJoin(favorites, eq(trips.id, favorites.tripId));

    // Filtering
    const whereClauses = [];
    if (filters) {
      if (filters.city) {
        whereClauses.push(eq(trips.city, filters.city));
      }
      if (filters.type) {
        whereClauses.push(eq(trips.type, filters.type));
      }
      if (filters.date_from) {
        whereClauses.push(gte(trips.date, filters.date_from));
      }
      if (filters.date_to) {
        whereClauses.push(lte(trips.date, filters.date_to));
      }
      if (filters.creatorId) {
        whereClauses.push(eq(trips.creatorId, filters.creatorId));
      }
    }
    if (whereClauses.length > 0) {
      query = query.where(and(...whereClauses));
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    query = query.groupBy(trips.id, users.id).orderBy(desc(trips.createdAt));

    const result = await query;

    return result.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      city: row.city,
      location: row.location,
      route: row.route,
      date: row.date,
      time: row.time,
      maxParticipants: row.maxParticipants,
      creatorId: row.creatorId,
      mainPhotoUrl: row.mainPhotoUrl,
      additionalPhotos: row.additionalPhotos,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      creator: {
        id: row.creatorId,
        name: row.creatorName,
        email: row.creatorEmail,
        age: row.creatorAge,
        bio: row.creatorBio,
        city: row.creatorCity,
        phone: row.creatorPhone,
        languages: row.creatorLanguages,
        messengers: row.creatorMessengers,
        avatarUrl: row.creatorAvatarUrl,
        avatarThumbnailUrl: row.creatorAvatarThumbnailUrl,
        additionalPhotos: row.creatorAdditionalPhotos,
      },
      participantsCount: row.participantsCount || 0,
      favoritesCount: row.favoritesCount || 0,
    }));
  }

  async getTripById(id: string): Promise<TripWithDetails | undefined> {
    const result = await db
      .select({
        id: trips.id,
        title: trips.title,
        description: trips.description,
        type: trips.type,
        city: trips.city,
        location: trips.location,
        route: trips.route,
        date: trips.date,
        time: trips.time,
        maxParticipants: trips.maxParticipants,
        creatorId: trips.creatorId,
        mainPhotoUrl: trips.mainPhotoUrl,
        additionalPhotos: trips.additionalPhotos,
        createdAt: trips.createdAt,
        updatedAt: trips.updatedAt,
        creatorName: users.name,
        creatorEmail: users.email,
        creatorAge: users.age,
        creatorBio: users.bio,
        creatorCity: users.city,
        creatorPhone: users.phone,
        creatorLanguages: users.languages,
        creatorMessengers: users.messengers,
        creatorAvatarUrl: users.avatarUrl,
        creatorAvatarThumbnailUrl: users.avatarThumbnailUrl,
        creatorAdditionalPhotos: users.additionalPhotos,
        participantsCount: sql<number>`cast(count(case when ${tripParticipants.status} = 'approved' then 1 end) as integer)`,
        favoritesCount: sql<number>`cast(count(distinct case when ${favorites.tripId} is not null then ${favorites.userId} end) as integer)`,
      })
      .from(trips)
      .innerJoin(users, eq(trips.creatorId, users.id))
      .leftJoin(tripParticipants, eq(trips.id, tripParticipants.tripId))
      .leftJoin(favorites, eq(trips.id, favorites.tripId))
      .where(eq(trips.id, id))
      .groupBy(
        trips.id,
        users.id,
        users.name,
        users.email,
        users.age,
        users.bio,
        users.city,
        users.phone,
        users.languages,
        users.messengers,
        users.avatarUrl,
        users.avatarThumbnailUrl,
        users.additionalPhotos,
      );

    const [row] = result;
    if (!row) return undefined;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      city: row.city,
      location: row.location,
      route: row.route,
      date: row.date,
      time: row.time,
      maxParticipants: row.maxParticipants,
      creatorId: row.creatorId,
      mainPhotoUrl: row.mainPhotoUrl,
      additionalPhotos: row.additionalPhotos,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      creator: {
        id: row.creatorId,
        name: row.creatorName,
        email: row.creatorEmail,
        age: row.creatorAge,
        bio: row.creatorBio,
        city: row.creatorCity,
        phone: row.creatorPhone,
        languages: row.creatorLanguages,
        messengers: row.creatorMessengers,
        avatarUrl: row.creatorAvatarUrl,
        avatarThumbnailUrl: row.creatorAvatarThumbnailUrl,
        additionalPhotos: row.creatorAdditionalPhotos,
      },
      participantsCount: row.participantsCount || 0,
      favoritesCount: row.favoritesCount || 0,
    };
  }

  async createTrip(trip: InsertTrip, creatorId: string): Promise<Trip> {
    // Exclude service field that doesn't exist in table
    const { creatorParticipates = true, ...tripData } = trip as any;

    // Create the route itself
    const [newTrip] = await db
      .insert(trips)
      .values({
        ...tripData,
        date: trip.date ?? null,
        time: trip.time ?? null,
        creatorId,
      })
      .returning();

    // By default, consider that creator automatically participates in trip
    if (creatorParticipates) {
      await this.joinTripAsApproved(newTrip.id, creatorId);
    }

    return newTrip;
  }

  async joinTrip(tripId: string, userId: string): Promise<void> {
    await db.insert(tripParticipants).values({
      tripId,
      userId,
      status: "pending",
    });
  }

  async joinTripAsApproved(tripId: string, userId: string): Promise<void> {
    await db.insert(tripParticipants).values({
      tripId,
      userId,
      status: "approved",
    });
  }

  async getUserTripStatus(
    tripId: string,
    userId: string,
  ): Promise<string | null> {
    const participant = await db
      .select({ status: tripParticipants.status })
      .from(tripParticipants)
      .where(
        and(
          eq(tripParticipants.tripId, tripId),
          eq(tripParticipants.userId, userId),
        ),
      )
      .limit(1);

    return participant.length > 0 ? participant[0].status : null;
  }

  async leaveTrip(tripId: string, userId: string): Promise<void> {
    await db
      .delete(tripParticipants)
      .where(
        and(
          eq(tripParticipants.tripId, tripId),
          eq(tripParticipants.userId, userId),
        ),
      );
  }

  async getTripParticipants(tripId: string): Promise<UserProfile[]> {
    // Get trip to find creator
    const trip = await this.getTripById(tripId);
    if (!trip) return [];

    // Get approved participants
    const participants = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        avatarThumbnailUrl: users.avatarThumbnailUrl,
        bio: users.bio,
        city: users.city,
        phone: users.phone,
        age: users.age,
        languages: users.languages,
        additionalPhotos: users.additionalPhotos,
        messengers: users.messengers,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(tripParticipants)
      .innerJoin(users, eq(tripParticipants.userId, users.id))
      .where(
        and(
          eq(tripParticipants.tripId, tripId),
          eq(tripParticipants.status, "approved"),
        ),
      );

    // Add trip creator to participants list
    const creator = await this.getUserProfile(trip.creatorId);
    if (creator) {
      const creatorInParticipants = participants.find(
        (p) => p.id === creator.id,
      );
      if (!creatorInParticipants) {
        participants.unshift(creator); // Add creator at the beginning
      }
    }

    return participants;
  }

  async isUserParticipant(tripId: string, userId: string): Promise<boolean> {
    // Check if user is route creator
    const trip = await this.getTripById(tripId);
    if (!trip) return false;
    if (trip.creatorId === userId) return true;

    // Check if user is approved participant
    const participant = await db
      .select()
      .from(tripParticipants)
      .where(
        and(
          eq(tripParticipants.tripId, tripId),
          eq(tripParticipants.userId, userId),
          eq(tripParticipants.status, "approved"),
        ),
      )
      .limit(1);

    return participant.length > 0;
  }

  async getTripComments(tripId: string): Promise<CommentWithUser[]> {
    const result = await db
      .select({
        id: comments.id,
        tripId: comments.tripId,
        userId: comments.userId,
        text: comments.text,
        createdAt: comments.createdAt,
        user: {
          id: users.id,
          name: users.name,
        },
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.tripId, tripId))
      .orderBy(desc(comments.createdAt));

    return result.map((row) => ({
      id: row.id,
      tripId: row.tripId,
      userId: row.userId,
      text: row.text,
      createdAt: row.createdAt,
      user: row.user!,
    }));
  }

  async createComment(
    comment: InsertComment & { tripId: string; userId: string },
  ): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values({
        tripId: comment.tripId,
        text: comment.text,
        userId: comment.userId,
      })
      .returning();
    return newComment;
  }

  async getTripTypes(): Promise<TripType[]> {
    return await db
      .select({
        id: tripTypes.id,
        name: tripTypes.name,
        ordering: tripTypes.ordering,
        description: tripTypes.description,
      })
      .from(tripTypes);
  }

  async initializeTripTypes(): Promise<void> {
    const existingTypes = await this.getTripTypes();
    if (existingTypes.length === 0) {
      await db.insert(tripTypes).values([
        { id: "walk", name: "Walk" },
        { id: "bike", name: "Bicycle" },
        { id: "car", name: "Car" },
        { id: "public_transport", name: "Public Transport" },
        { id: "boat", name: "Boat" },
        { id: "train", name: "Train" },
        { id: "plane", name: "Plane" },
      ]);
    }
  }

  async getConversations(userId: string): Promise<ChatConversation[]> {
    console.log(`Getting conversations for user: ${userId}`);

    // Temporarily return empty array to fix error
    // TODO: Rewrite function for new chat structure
    return [];
  }

  async getMessages(
    userId: string,
    otherUserId: string,
    tripId?: string | null,
  ): Promise<MessageWithUsers[]> {
    // Temporarily return empty array to fix error
    // TODO: Rewrite function for new chat structure
    return [];
  }

  async sendMessage(
    message: InsertMessage & { senderId: string; tripId?: string | null },
  ): Promise<Message> {
    // Temporarily return empty object to fix error
    // TODO: Rewrite function for new chat structure
    return {} as Message;
  }

  async markMessagesAsRead(
    userId: string,
    otherUserId: string,
    tripId?: string | null,
  ): Promise<void> {
    // Temporarily do nothing to fix error
    // TODO: Rewrite function for new chat structure
  }

  async addToFavorites(tripId: string, userId: string): Promise<void> {
    await db.insert(favorites).values({
      tripId,
      userId,
    });
  }

  async removeFromFavorites(tripId: string, userId: string): Promise<void> {
    await db
      .delete(favorites)
      .where(and(eq(favorites.tripId, tripId), eq(favorites.userId, userId)));
  }

  async getUserFavorites(userId: string): Promise<TripWithDetails[]> {
    const result = await db
      .select({
        id: trips.id,
        title: trips.title,
        description: trips.description,
        city: trips.city,
        location: trips.location,
        date: trips.date,
        time: trips.time,
        maxParticipants: trips.maxParticipants,
        type: trips.type,
        mainPhotoUrl: trips.mainPhotoUrl,
        additionalPhotos: trips.additionalPhotos,
        route: trips.route,
        creatorId: trips.creatorId,
        createdAt: trips.createdAt,
        updatedAt: trips.updatedAt,
        creatorName: users.name,
        creatorEmail: users.email,
        creatorAge: users.age,
        creatorBio: users.bio,
        creatorCity: users.city,
        creatorPhone: users.phone,
        creatorLanguages: users.languages,
        creatorMessengers: users.messengers,
        creatorAvatarUrl: users.avatarUrl,
        creatorAvatarThumbnailUrl: users.avatarThumbnailUrl,
        creatorAdditionalPhotos: users.additionalPhotos,
        participantsCount: count(tripParticipants.id),
      })
      .from(favorites)
      .innerJoin(trips, eq(favorites.tripId, trips.id))
      .innerJoin(users, eq(trips.creatorId, users.id))
      .leftJoin(tripParticipants, eq(trips.id, tripParticipants.tripId))
      .where(eq(favorites.userId, userId))
      .groupBy(trips.id, users.id);

    return result.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      city: row.city,
      location: row.location,
      date: row.date,
      time: row.time,
      maxParticipants: row.maxParticipants,
      type: row.type,
      mainPhotoUrl: row.mainPhotoUrl,
      additionalPhotos: row.additionalPhotos,
      route: row.route,
      creatorId: row.creatorId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      creator: {
        id: row.creatorId,
        name: row.creatorName,
        email: row.creatorEmail,
        age: row.creatorAge,
        bio: row.creatorBio,
        city: row.creatorCity,
        phone: row.creatorPhone,
        languages: row.creatorLanguages,
        messengers: row.creatorMessengers,
        avatarUrl: row.creatorAvatarUrl,
        avatarThumbnailUrl: row.creatorAvatarThumbnailUrl,
        additionalPhotos: row.creatorAdditionalPhotos,
      },
      participantsCount: row.participantsCount,
    }));
  }

  async isFavorite(tripId: string, userId: string): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.tripId, tripId), eq(favorites.userId, userId)));
    return !!favorite;
  }

  async acceptTripRequest(tripId: string, userId: string): Promise<void> {
    // Update; if not — insert as approved
    const res = await db
      .update(tripParticipants)
      .set({ status: "approved" })
      .where(
        and(
          eq(tripParticipants.tripId, tripId),
          eq(tripParticipants.userId, userId),
        ),
      );

    if ((res as any).rowCount === 0) {
      await db
        .insert(tripParticipants)
        .values({ tripId, userId, status: "approved" });
    }

    // Get route information
    const trip = await this.getTripById(tripId);
    if (!trip) return;
  }

  async rejectTripRequest(tripId: string, userId: string): Promise<void> {
    const res = await db
      .update(tripParticipants)
      .set({ status: "rejected" })
      .where(
        and(
          eq(tripParticipants.tripId, tripId),
          eq(tripParticipants.userId, userId),
        ),
      );
    if ((res as any).rowCount === 0) {
      await db
        .insert(tripParticipants)
        .values({ tripId, userId, status: "rejected" });
    }
  }
}

export const storage = new DatabaseStorage();
