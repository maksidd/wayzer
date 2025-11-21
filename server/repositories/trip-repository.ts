import {
    trips,
    users,
    tripParticipants,
    comments,
    favorites,
    tripTypes,
    type Trip,
    type InsertTrip,
    type TripWithDetails,
    type TripFilters,
    type UserProfile,
    type Comment,
    type InsertComment,
    type CommentWithUser,
    type TripType,
} from "@shared/schema";
import { db } from "../db";
import {
    eq,
    and,
    gte,
    lte,
    desc,
    count,
    sql,
    asc,
} from "drizzle-orm";
import { UserRepository } from "./user-repository";

export class TripRepository {
    private userRepo: UserRepository;

    constructor() {
        this.userRepo = new UserRepository();
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
        const whereClauses = [eq(users.status, "active")];
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

        query = query
            .groupBy(trips.id, users.id)
            .having(
                sql`cast(count(case when ${tripParticipants.status} = 'approved' then 1 end) as integer) < ${trips.maxParticipants}`,
            )
            .orderBy(desc(trips.createdAt));

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
            .where(and(eq(trips.id, id), eq(users.status, "active")))
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
        const creator = await this.userRepo.getUserProfile(trip.creatorId);
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
                ordering: tripTypes.ordering,
            })
            .from(tripTypes)
            .orderBy(asc(tripTypes.ordering), asc(tripTypes.id));
    }

    async initializeTripTypes(): Promise<void> {
        const existingTypes = await this.getTripTypes();
        if (existingTypes.length === 0) {
            const defaultTypes: { id: string; ordering: number }[] = [
                { id: "walk", ordering: 10 },
                { id: "bike", ordering: 20 },
                { id: "car", ordering: 30 },
                { id: "scooter", ordering: 40 },
                { id: "monowheel", ordering: 50 },
                { id: "motorcycle", ordering: 60 },
                { id: "public_transport", ordering: 70 },
                { id: "train", ordering: 80 },
                { id: "plane", ordering: 90 },
                { id: "boat", ordering: 100 },
                { id: "sea", ordering: 110 },
                { id: "mountains", ordering: 120 },
                { id: "sights", ordering: 130 },
                { id: "fest", ordering: 140 },
                { id: "picnic", ordering: 150 },
                { id: "camping", ordering: 160 },
                { id: "party", ordering: 170 },
                { id: "retreat", ordering: 180 },
                { id: "pets", ordering: 190 },
                { id: "other", ordering: 999 },
            ];
            await db.insert(tripTypes).values(defaultTypes);
        }
    }

    async acceptTripRequest(tripId: string, userId: string): Promise<void> {
        await db
            .update(tripParticipants)
            .set({ status: "approved" })
            .where(
                and(
                    eq(tripParticipants.tripId, tripId),
                    eq(tripParticipants.userId, userId),
                ),
            );
    }

    async rejectTripRequest(tripId: string, userId: string): Promise<void> {
        await db
            .update(tripParticipants)
            .set({ status: "rejected" })
            .where(
                and(
                    eq(tripParticipants.tripId, tripId),
                    eq(tripParticipants.userId, userId),
                ),
            );
    }

    async addToFavorites(tripId: string, userId: string): Promise<void> {
        await db
            .insert(favorites)
            .values({
                tripId,
                userId,
            })
            .onConflictDoNothing();
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
            .from(favorites)
            .innerJoin(trips, eq(favorites.tripId, trips.id))
            .innerJoin(users, eq(trips.creatorId, users.id))
            .leftJoin(tripParticipants, eq(trips.id, tripParticipants.tripId))
            .where(eq(favorites.userId, userId))
            .groupBy(trips.id, users.id)
            .orderBy(desc(favorites.createdAt));

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

    async isFavorite(tripId: string, userId: string): Promise<boolean> {
        const result = await db
            .select()
            .from(favorites)
            .where(and(eq(favorites.tripId, tripId), eq(favorites.userId, userId)))
            .limit(1);
        return result.length > 0;
    }
}
