import { Router } from "express";
import path from "path";
import crypto from "crypto";
import { sql, eq } from "drizzle-orm";
import { storage } from "../storage";
import { db } from "../db";
import { trips } from "@shared/schema";
import { authenticateToken, type AuthenticatedRequest } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validation";
import { uploadPhoto } from "../middleware/upload";
import { uploadToR2 } from "../r2";
import {
    insertTripSchema,
    tripFiltersSchema,
    type TripFilters,
} from "@shared/schema";

const router = Router();

// Get trips with optional filtering
router.get(
    "/",
    validateQuery(tripFiltersSchema as any),
    async (req, res) => {
        try {
            const filters = req.query as TripFilters;
            const trips = await storage.getTrips(filters);

            // 1) Keep only routes where there are still free spots
            // Now handled in SQL
            const availableTrips = trips;

            res.json(availableTrips);
        } catch (error) {
            console.error("Get trips error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    });

// Upload main photo for trip
router.post(
    "/upload-main-photo",
    authenticateToken,
    uploadPhoto.single("photo"),
    async (req: AuthenticatedRequest, res) => {
        try {
            if (!req.user?.userId) {
                return res.status(401).json({ message: "User not authenticated" });
            }

            const file = req.file;
            if (!file || !file.buffer) {
                return res.status(400).json({ message: "No file uploaded" });
            }

            const userId = req.user.userId;
            const ext = path.extname(file.originalname || "") || ".jpg";
            const randomHash = crypto.randomBytes(16).toString("hex");
            const filename = `${userId}_${randomHash}${ext}`;
            const key = `photos/${filename}`;

            const photoUrl = await uploadToR2({
                key,
                body: file.buffer,
                contentType: file.mimetype,
            });

            res.json({
                message: "Photo uploaded successfully",
                photoUrl: photoUrl,
            });
        } catch (error) {
            console.error("Error uploading trip photo:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
);

// Upload additional photos for trip
router.post(
    "/upload-additional-photos",
    authenticateToken,
    uploadPhoto.array("photos", 10),
    async (req: AuthenticatedRequest, res) => {
        try {
            if (!req.user?.userId) {
                return res.status(401).json({ message: "User not authenticated" });
            }

            if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
                return res.status(400).json({ message: "No files uploaded" });
            }
            const userId = req.user.userId;

            const uploadPromises = req.files.map(async (file) => {
                const ext = path.extname(file.originalname || "") || ".jpg";
                const randomHash = crypto.randomBytes(16).toString("hex");
                const filename = `${userId}_${randomHash}${ext}`;
                const key = `photos/${filename}`;

                const url = await uploadToR2({
                    key,
                    body: (file as any).buffer,
                    contentType: file.mimetype,
                });

                return { filename, url };
            });

            const uploaded = await Promise.all(uploadPromises);
            const photoUrls = uploaded.map((u) => u.url);

            res.json({
                message: "Photos uploaded successfully",
                photoUrls: photoUrls,
            });
        } catch (error) {
            console.error("Error uploading trip photos:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
);

// Upload additional photos for specific trip
router.post(
    "/:tripId/photos",
    authenticateToken,
    uploadPhoto.array("photos", 10),
    async (req: AuthenticatedRequest, res) => {
        try {
            if (!req.user?.userId) {
                return res.status(401).json({ message: "User not authenticated" });
            }

            const { tripId } = req.params;
            const userId = req.user.userId;

            // Check if trip exists and user is creator
            const trip = await storage.getTripById(tripId);
            if (!trip) {
                return res.status(404).json({ message: "Trip not found" });
            }
            if (trip.creatorId !== userId) {
                return res.status(403).json({ message: "Only trip creator can add photos" });
            }

            if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
                return res.status(400).json({ message: "No files uploaded" });
            }

            const uploadPromises = req.files.map(async (file) => {
                const ext = path.extname(file.originalname || "") || ".jpg";
                const randomHash = crypto.randomBytes(16).toString("hex");
                const filename = `${userId}_${randomHash}${ext}`;
                const key = `photos/${filename}`;

                const url = await uploadToR2({
                    key,
                    body: (file as any).buffer,
                    contentType: file.mimetype,
                });

                return { filename, url };
            });

            const uploaded = await Promise.all(uploadPromises);
            const photoUrls = uploaded.map((u) => u.url);

            // Update trip with new photos
            const existingPhotos = trip.additionalPhotos || [];
            const updatedPhotos = [...existingPhotos, ...photoUrls];

            await db
                .update(trips)
                .set({
                    additionalPhotos: updatedPhotos,
                    updatedAt: sql`NOW()`,
                })
                .where(eq(trips.id, tripId));

            res.json({
                message: "Photos uploaded and added to trip successfully",
                photoUrls: photoUrls,
            });
        } catch (error) {
            console.error("Error uploading trip photos:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
);

// Create trip
router.post(
    "/",
    authenticateToken,
    validateBody(insertTripSchema as any),
    async (req: AuthenticatedRequest, res) => {
        try {
            const userId = req.user!.userId;
            const tripData = req.body;

            // Create route
            const trip = await storage.createTrip(tripData, userId);

            res.status(201).json(trip);
        } catch (error) {
            console.error("Create trip error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
);

// Get single trip
router.get("/:id", async (req, res) => {
    try {
        const trip = await storage.getTripById(req.params.id);
        if (!trip) {
            res.status(404).json({ message: "Trip not found" });
            return;
        }

        res.json(trip);
    } catch (error) {
        console.error("Get trip error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get trip status for current user
router.get(
    "/:id/status",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
        try {
            const tripId = req.params.id;
            const userId = req.user!.userId;
            const status = await storage.getUserTripStatus(tripId, userId);
            res.json({ status });
        } catch (error) {
            console.error("Error fetching trip status:", error);
            res.status(500).json({ message: "Failed to fetch trip status" });
        }
    },
);

// Get trip status for specific user
router.get(
    "/:tripId/status/:userId",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
        try {
            const { tripId, userId } = req.params;
            const currentUserId = req.user!.userId;

            // Check if current user is the trip creator (only creator can check other users' status)
            const trip = await storage.getTripById(tripId);
            if (!trip || trip.creatorId !== currentUserId) {
                return res.status(403).json({ message: "Only trip creator can check participants status" });
            }

            const status = await storage.getUserTripStatus(tripId, userId);
            res.json({ status });
        } catch (error) {
            console.error("Error fetching user trip status:", error);
            res.status(500).json({ message: "Failed to fetch user trip status" });
        }
    },
);

// Leave trip
router.delete(
    "/:id/leave",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
        try {
            const tripId = req.params.id;
            const userId = req.user!.userId;

            // Check if user is a participant
            const isParticipant = await storage.isUserParticipant(tripId, userId);
            if (!isParticipant) {
                res.status(409).json({ message: "Not a participant of this trip" });
                return;
            }

            await storage.leaveTrip(tripId, userId);
            res.json({ message: "Successfully left trip" });
        } catch (error) {
            console.error("Leave trip error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
);

// Get trip participants
router.get("/:id/participants", async (req, res) => {
    try {
        const participants = await storage.getTripParticipants(req.params.id);
        res.json(participants);
    } catch (error) {
        console.error("Get participants error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
