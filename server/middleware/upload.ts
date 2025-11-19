import multer from "multer";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { deleteFromR2, buildR2Url } from "../r2";

// File filter for images only
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
};

// In-memory storage: дальше заливаем буферы прямо в R2
const memoryStorage = multer.memoryStorage();

export const uploadPhoto = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10, // Max 10 files at once
  },
});

export const uploadAvatar = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for avatars
    files: 1, // Only one avatar at a time
  },
});

// Thumbnail для аватара — работаем с буфером
export async function createAvatarThumbnailBuffer(
  buffer: Buffer,
): Promise<Buffer> {
  try {
    const thumbnailBuffer = await sharp(buffer)
      .resize(64, 64, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    return thumbnailBuffer;
  } catch (error) {
    console.error("Error creating avatar thumbnail:", error);
    // fallback — возвращаем оригинальный буфер, если thumbnail не удалось создать
    return buffer;
  }
}

// Utility function to get photo URL
export function getPhotoUrl(filename: string): string {
  const key = `photos/${filename}`;
  return buildR2Url(key);
}

// Utility function to get avatar URL
export function getAvatarUrl(filename: string): string {
  const key = `avatars/${filename}`;
  return buildR2Url(key);
}

// Utility function to delete photo object in R2
export function deletePhotoFile(filename: string): void {
  const key = `photos/${filename}`;
  deleteFromR2(key).catch((error) => {
    console.error("Error deleting R2 photo object:", error);
  });
}

// Utility function to delete avatar object and its thumbnail in R2
export function deleteAvatarFile(filename: string): void {
  const originalKey = `avatars/${filename}`;
  const thumbKey = `avatars/${filename.replace(/(\.[^.]+)$/, "_thumb$1")}`;

  deleteFromR2(originalKey).catch((error) => {
    console.error("Error deleting R2 avatar object:", error);
  });

  deleteFromR2(thumbKey).catch((error) => {
    console.error("Error deleting R2 avatar thumbnail object:", error);
  });
}





