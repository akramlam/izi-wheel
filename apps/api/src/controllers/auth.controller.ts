import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../utils/db';
import { hashPassword, comparePassword } from '../utils/auth';
import { generateToken } from '../utils/jwt';
import { z } from 'zod';

// Validation schema for login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Validation schema for registration
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  companyId: z.string().uuid().optional(),
  role: z.nativeEnum(Role),
});

// Validation schema for password change
const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 *       401:
 *         description: Invalid credentials
 */
/**
 * User login
 */
export const login = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: validation.error.format() 
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUniqueOrThrow({
      where: { email, isActive: true, password},
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        companyId: true,
        name: true,
        isPaid: true,
        forcePasswordChange: true,
        isActive: true,
        createdAt: true,
        deletedAt: true,
      }
    });

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password!);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Return user info and token
    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        isPaid: user.isPaid,
        name: user.name,
        forcePasswordChange: user.forcePasswordChange,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *               companyId:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered
 *       400:
 *         description: Invalid input or email in use
 */
/**
 * User registration (admin only)
 */
export const register = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: validation.error.format() 
      });
    }

    const { email, password, role, companyId } = req.body;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Enforce only one SUPER user in the system
    if (role === Role.SUPER) {
      const existingSuper = await prisma.user.findFirst({ where: { role: Role.SUPER } });
      if (existingSuper) {
        return res.status(400).json({ error: 'A super user already exists. Only one super user is allowed.' });
      }
    }

    // Validate company ID if provided (except for SUPER users)
    if (companyId && role !== Role.SUPER) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return res.status(400).json({ error: 'Invalid company ID' });
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        companyId: role === Role.SUPER ? null : companyId,
      },
    });

    // Generate JWT token
    const token = generateToken(newUser);

    // Return user info and token
    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        companyId: newUser.companyId,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags:
 *       - Auth
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validation.error.format()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password!);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password and remove forcePasswordChange flag
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        forcePasswordChange: false
      }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

/**
 * @openapi
 * /auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Authentication required
 */
/**
 * Get current user profile
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        isPaid: true,
        name: true,
        forcePasswordChange: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(200).json({ 
        user: null,
        error: 'User not found in database'
      });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ 
      user: null,
      error: 'Failed to get user profile' 
    });
  }
}; 