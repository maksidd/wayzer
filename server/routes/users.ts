import { Router } from "express";
import path from "path";
import crypto from "crypto";
import { storage } from "../storage";
import { authenticateToken, type AuthenticatedRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validation";
import {
    uploadPhoto,
    uploadAvatar,
    getPhotoUrl,
    deletePhotoFile,
    deleteAvatarFile,
    createAvatarThumbnailBuffer,
} from "../middleware/upload";
import { uploadToR2, extractR2KeyFromUrl } from "../r2";
import { updateUserProfileSchema } from "@shared/schema";

const router = Router();

// Get current user profile
router.get(
    "/me",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
        try {
            const user = await storage.getUserProfile(req.user!.userId);
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }

            res.json(user);
        } catch (error) {
            console.error("Get profile error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
);

// Update user profile
router.patch(
    "/profile",
    authenticateToken,
    validateBody(updateUserProfileSchema as any),
    async (req: AuthenticatedRequest, res) => {
        try {
            if (!req.user?.userId) {
                return res.status(401).json({ message: "User not authenticated" });
            }

            const updateData = req.body;
            const updatedUser = await storage.updateUserProfile(
                req.user.userId,
                updateData,
            );

            if (!updatedUser) {
                return res.status(404).json({ message: "User not found" });
            }

            res.json(updatedUser);
        } catch (error) {
            console.error("Error updating user profile:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
);

// Upload avatar photo
router.post(
    "/avatar",
    authenticateToken,
    uploadAvatar.single("avatar"),
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
            const baseFilename = `${userId}_${randomHash}${ext}`;

            const originalKey = `avatars/${baseFilename}`;
            const thumbFilename = baseFilename.replace(/(\.[^.]+)$/, "_thumb$1");
            const thumbKey = `avatars/${thumbFilename}`;

            const thumbnailBuffer = await createAvatarThumbnailBuffer(file.buffer);

            const [avatarUrl, avatarThumbnailUrl] = await Promise.all([
                uploadToR2({
                    key: originalKey,
                    body: file.buffer,
                    contentType: file.mimetype,
                }),
                uploadToR2({
                    key: thumbKey,
                    body: thumbnailBuffer,
                    contentType: "image/jpeg",
                }),
            ]);

            // Get current user to delete old avatar and thumbnail if exists
            const currentUser = await storage.getUserProfile(userId);
            if (currentUser?.avatarUrl) {
                const oldKey = extractR2KeyFromUrl(currentUser.avatarUrl);
                if (oldKey) {
                    const oldFilename = oldKey.split("/").pop();
                    if (oldFilename) {
                        deleteAvatarFile(oldFilename);
                    }
                }
            }

            // Update user avatar and thumbnail
            const updatedUser = await storage.updateUserProfile(userId, {
                avatarUrl: avatarUrl,
                avatarThumbnailUrl: avatarThumbnailUrl,
            });

            res.json({
                message: "Avatar uploaded successfully",
                avatarUrl: avatarUrl,
                avatarThumbnailUrl: avatarThumbnailUrl,
                user: updatedUser,
            });
        } catch (error) {
            console.error("Error uploading avatar:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
);

// Upload additional photos
router.post(
    "/photos",
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

            // Get current user photos and add new ones
            const currentUser = await storage.getUserProfile(req.user.userId);
            const existingPhotos = currentUser?.additionalPhotos || [];
            const updatedPhotos = [...existingPhotos, ...photoUrls];

            // Update user additional photos
            const updatedUser = await storage.updateUserProfile(req.user.userId, {
                additionalPhotos: updatedPhotos,
            });

            res.json({
                message: "Photos uploaded successfully",
                photoUrls,
                user: updatedUser,
            });
        } catch (error) {
            console.error("Error uploading photos:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
);

// Delete additional photo
router.delete(
    "/photos/:filename",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
        try {
            if (!req.user?.userId) {
                return res.status(401).json({ message: "User not authenticated" });
            }

            const filename = req.params.filename;
            const photoUrl = getPhotoUrl(filename);

            // Get current user and remove photo from additional photos
            const currentUser = await storage.getUserProfile(req.user.userId);
            if (!currentUser?.additionalPhotos) {
                return res.status(404).json({ message: "Photo not found" });
            }

            const updatedPhotos = currentUser.additionalPhotos.filter(
                (url) => url !== photoUrl,
            );

            // Update user additional photos
            const updatedUser = await storage.updateUserProfile(req.user.userId, {
                additionalPhotos: updatedPhotos,
            });

            // Delete the actual file
            deletePhotoFile(filename);

            res.json({
                message: "Photo deleted successfully",
                user: updatedUser,
            });
        } catch (error) {
            console.error("Error deleting photo:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
);

// Get public user profile
router.get("/:id", async (req, res) => {
    try {
        const user = await storage.getUserProfile(req.params.id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        // Return extended public information (without sensitive data)
        const publicProfile = {
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl,
            avatarThumbnailUrl: user.avatarThumbnailUrl,
            age: user.age,
            city: user.city,
            bio: user.bio,
            phone: user.phone,
            languages: user.languages,
            messengers: user.messengers,
            additionalPhotos: user.additionalPhotos,
            createdAt: user.createdAt,
        };

        res.json(publicProfile);
    } catch (error) {
        console.error("Get user profile error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
