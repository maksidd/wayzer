import {
    users,
    trips,
    tripParticipants,
    comments,
    favorites,
    messages,
    type User,
    type InsertUser,
    type UserProfile,
    type UpdateUserProfile,
} from "@shared/schema";
import { db } from "../db";
import { eq, inArray, or } from "drizzle-orm";

export class UserRepository {
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

    async getAllUsers(): Promise<Pick<User, "id" | "name" | "email" | "role" | "status">[]> {
        const usersData = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                status: users.status,
            })
            .from(users);
        return usersData.map((row) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            status: row.status,
        }));
    }

    async updateUserStatus(userId: string, status: "active" | "blocked"): Promise<void> {
        await db
            .update(users)
            .set({ status, updatedAt: new Date() })
            .where(eq(users.id, userId));
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
}
