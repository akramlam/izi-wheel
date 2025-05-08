import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { Role } from '@prisma/client';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
        companyId?: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT and attaches user to request
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Extract token from header
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    // Verify token and attach user to request
    const decodedToken = verifyToken(token);
    req.user = decodedToken;
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Role guard middleware factory
 * Creates middleware to restrict access based on user role
 */
export const roleGuard = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

/**
 * Company access guard
 * Ensures users can only access their own company resources
 */
export const companyGuard = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // SUPER users can access all companies
  if (req.user.role === Role.SUPER) {
    return next();
  }

  const companyId = req.params.companyId || req.body.companyId;
  
  // No company ID in request, continue (will be caught by other middleware if needed)
  if (!companyId) {
    return next();
  }

  // Check if user belongs to the requested company
  if (req.user.companyId !== companyId) {
    return res.status(403).json({ error: 'Access denied to this company resource' });
  }

  next();
}; 