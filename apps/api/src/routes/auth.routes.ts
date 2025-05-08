import { Router } from 'express';
import { login, register, getProfile } from '../controllers/auth.controller';
import { authMiddleware, roleGuard } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router: Router = Router();

/**
 * @route   POST /auth/login
 * @desc    Login a user
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /auth/register
 * @desc    Register a new user (SUPER or ADMIN only)
 * @access  Private
 */
router.post(
  '/register',
  authMiddleware,
  roleGuard([Role.SUPER, Role.ADMIN]),
  register
);

/**
 * @route   GET /auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authMiddleware, getProfile);

export default router; 