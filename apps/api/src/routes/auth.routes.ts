import { Router, Request, Response, NextFunction } from 'express';
import { login, register, getProfile, changePassword, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { authMiddleware, roleGuard } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';
import prisma from '../utils/db';

const router: Router = Router();

/**
 * @route   POST /auth/login
 * @desc    Login a user
 * @access  Public
 */
router.post('/login', login);

// Middleware to allow open registration for the first super user
const allowFirstSuperRegistration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existingSuper = await prisma.user.findFirst({ where: { role: Role.SUPER } });
    if (!existingSuper) {
      // No super user exists, allow open registration
      return next();
    }
    // Otherwise, require authentication and role
    return authMiddleware(req, res, () => roleGuard([Role.SUPER, Role.ADMIN])(req, res, next));
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * @route   POST /auth/register
 * @desc    Register a new user (SUPER or ADMIN only)
 * @access  Private
 */
router.post(
  '/register',
  allowFirstSuperRegistration,
  register
);

/**
 * @route   POST /auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authMiddleware, changePassword);

/**
 * @route   GET /auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authMiddleware, getProfile);

/**
 * @route   GET /auth/me
 * @desc    Get current user profile (alias for /auth/profile)
 * @access  Private
 */
router.get('/me', authMiddleware, getProfile);

// Add a debug endpoint to check current user info
router.get('/me/debug', authMiddleware, (req, res) => {
  // Return full user object for debugging
  return res.status(200).json({
    user: req.user,
    message: 'This is your current user information from the JWT token'
  });
});

/**
 * @route   POST /auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', resetPassword);

export default router; 