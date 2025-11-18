import { Response, NextFunction } from 'express';
import { storage } from '../storage';
import { AuthenticatedRequest } from './auth';

export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ message: 'Not authenticated' });
  const user = await storage.getUser(userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}; 