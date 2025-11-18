import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import sharp from 'sharp';

// Ensure uploads directories exist
const uploadsDir = path.join(process.cwd(), 'server/uploads/photos');
const avatarsDir = path.join(process.cwd(), 'server/uploads/avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Configure multer for general photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate filename: userId_randomHash.extension
    const userId = (req as any).user?.userId || 'anonymous';
    const randomHash = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    const filename = `${userId}_${randomHash}${ext}`;
    cb(null, filename);
  }
});

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    // Generate filename: userId_randomHash.extension
    const userId = (req as any).user?.userId || 'anonymous';
    const randomHash = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    const filename = `${userId}_${randomHash}${ext}`;
    cb(null, filename);
  }
});

// File filter for images only
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
  }
};

export const uploadPhoto = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10, // Max 10 files at once
  },
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for avatars
    files: 1, // Only one avatar at a time
  },
});

// Create avatar thumbnail function
export async function createAvatarThumbnail(filename: string): Promise<string> {
  const originalPath = path.join(avatarsDir, filename);
  const thumbnailFilename = filename.replace(/(\.[^.]+)$/, '_thumb$1');
  const thumbnailPath = path.join(avatarsDir, thumbnailFilename);

  try {
    await sharp(originalPath)
      .resize(64, 64, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 90 })
      .toFile(thumbnailPath);
    
    return thumbnailFilename;
  } catch (error) {
    console.error('Error creating avatar thumbnail:', error);
    return filename; // Return original if thumbnail creation fails
  }
}

// Utility function to get photo URL
export function getPhotoUrl(filename: string): string {
  return `/uploads/photos/${filename}`;
}

// Utility function to get avatar URL
export function getAvatarUrl(filename: string): string {
  return `/uploads/avatars/${filename}`;
}

// Utility function to delete photo file
export function deletePhotoFile(filename: string): void {
  try {
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting photo file:', error);
  }
}

// Utility function to delete avatar file and its thumbnail
export function deleteAvatarFile(filename: string): void {
  try {
    const filePath = path.join(avatarsDir, filename);
    const thumbnailPath = path.join(avatarsDir, filename.replace(/(\.[^.]+)$/, '_thumb$1'));
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    if (fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    }
  } catch (error) {
    console.error('Error deleting avatar file:', error);
  }
}