import { Request, Response, NextFunction } from 'express';
import { JWTUtils } from '../utils/jwt';
import { storage } from '../storage';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    status?: "active" | "blocked";
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ message: 'Access token required' });
    return;
  }

  try {
    const payload = JWTUtils.verifyToken(token);
    const dbUser = await storage.getUser(payload.userId);

    if (!dbUser) {
      res.status(401).json({ message: 'Account not found' });
      return;
    }

    if (dbUser.status !== 'active') {
      res.status(403).json({ message: 'Account blocked' });
      return;
    }

    req.user = {
      userId: dbUser.id,
      email: dbUser.email,
      status: dbUser.status,
    };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};
