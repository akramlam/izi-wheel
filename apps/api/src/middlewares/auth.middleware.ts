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
        isPaid: boolean;
        name?: string;
        forcePasswordChange?: boolean;
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
export const roleGuard = (allowedRoles: Role[], options: { bypassPaidCheck?: boolean } = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Role check for user:', req.user.email, 'Role:', req.user.role, 'isPaid:', req.user.isPaid);
    console.log('Request path:', req.path, 'Method:', req.method, 'BaseUrl:', req.baseUrl, 'OriginalUrl:', req.originalUrl);

    // SUPER admin always has access if role is allowed
    if (req.user.role === Role.SUPER && allowedRoles.includes(Role.SUPER)) {
      console.log('SUPER admin granted access');
      return next();
    }

    // Only allow if user's role is in allowedRoles
    if (!allowedRoles.includes(req.user.role)) {
      console.log('Access denied - role not in allowed roles:', allowedRoles);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // TEMPORARILY DISABLE ISPAID CHECK
    /*
    // Restrict ADMIN if not paid - but skip check if bypassPaidCheck is true
    // or if this is a wheel-related operation (modifying wheels should be allowed without payment)
    const fullUrl = req.baseUrl + req.path;
    const isWheelOperation = 
      // Check for direct wheel operations in originalUrl (e.g., /companies/ID/wheels/ID)
      (req.originalUrl.includes('/wheels/') || 
       // Check for wheels in path (when baseUrl doesn't include it)
       fullUrl.includes('/wheels/')) && 
      (req.method === 'PUT' || req.method === 'DELETE' || req.method === 'POST');
    
    console.log('Is wheel operation?', isWheelOperation, 'Full URL path:', fullUrl);
    
    if (req.user.role === Role.ADMIN && req.user.isPaid === false && 
        !options.bypassPaidCheck && !isWheelOperation) {
      console.log('ADMIN with isPaid=false denied access to paid feature');
      return res.status(403).json({ error: 'Admin must pay to access full admin features.' });
    }
    */

    // Always grant access regardless of isPaid status
    console.log('TEMPORARY FIX: Bypassing isPaid check');
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
    console.log('SUPER admin granted access to company resources');
    return next();
  }

  const companyId = req.params.companyId || req.body.companyId || req.params.cid;
  
  // No company ID in request, continue (will be caught by other middleware if needed)
  if (!companyId) {
    console.log('No company ID in request parameters, continuing...');
    return next();
  }

  // No company ID in user object
  if (!req.user.companyId) {
    console.log('User has no company ID:', req.user.email);
    return res.status(403).json({ error: 'No company ID associated with this account' });
  }

  // Check if user belongs to the requested company
  if (req.user.companyId !== companyId) {
    console.log('Access denied to company:', companyId, 'User belongs to:', req.user.companyId);
    return res.status(403).json({ error: 'Access denied to this company resource' });
  }

  next();
}; 