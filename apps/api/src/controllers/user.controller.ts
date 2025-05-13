import { Request, Response } from 'express';
import prisma from '../utils/db';
import { Role } from '@prisma/client';
import { hashPassword } from '../utils/auth';
import { generateRandomPassword } from '../utils/auth';
import { sendInviteEmail } from '../utils/mailer';

/**
 * @openapi
 * /companies/{companyId}/users:
 *   get:
 *     summary: Get all users for a company
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users
 */
export const getCompanyUsers = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    
    const users = await prisma.user.findMany({
      where: {
        companyId
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json({ users });
  } catch (error) {
    console.error('Get company users error:', error);
    res.status(500).json({ error: 'Failed to fetch company users' });
  }
};

/**
 * @openapi
 * /companies/{companyId}/users:
 *   post:
 *     summary: Invite a new user to a company
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: User invited
 *       400:
 *         description: Invalid input
 */
export const inviteUser = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { email, role, name } = req.body;
    const adminUser = req.user; // The current authenticated user
    
    // Validate role
    if (role !== Role.SUB && role !== Role.ADMIN) {
      return res.status(400).json({ 
        error: 'Invalid role. Must be either SUB or ADMIN' 
      });
    }
    
    // Check if email is already in use in this company
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        companyId
      }
    });
    
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use in this company' });
    }
    
    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Generate a temporary password
    const tempPassword = generateRandomPassword();
    const hashedPassword = await hashPassword(tempPassword);
    
    // Create the user
    const user = await prisma.user.create({
      data: {
        name: name || "",  // Use provided name or empty string
        email,
        password: hashedPassword,
        role,
        companyId,
        isActive: true,
        forcePasswordChange: true  // Force password change on first login
      }
    });
    
    // Get admin name from user object if available
    const adminName = adminUser?.name || adminUser?.email?.split('@')[0] || 'L\'administrateur';
    
    // Send invite email with temporary password
    await sendInviteEmail(email, tempPassword, company.name, adminName, name);
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    res.status(201).json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
};

/**
 * @openapi
 * /companies/{companyId}/users/{userId}:
 *   put:
 *     summary: Update a user in a company
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated
 *       400:
 *         description: Invalid input
 *       404:
 *         description: User not found
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { companyId, uid } = req.params;
    const { role, isActive } = req.body;
    
    // Check if user exists and belongs to the company
    const user = await prisma.user.findFirst({
      where: {
        id: uid,
        companyId
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found in this company' });
    }
    
    // Validate role if provided
    if (role && role !== Role.SUB && role !== Role.ADMIN) {
      return res.status(400).json({ 
        error: 'Invalid role. Must be either SUB or ADMIN' 
      });
    }
    
    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: uid },
      data: {
        ...(role && { role }),
        ...(isActive !== undefined ? { isActive } : {})
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        companyId: true,
        createdAt: true
      }
    });
    
    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

/**
 * @openapi
 * /companies/{companyId}/users/{userId}:
 *   delete:
 *     summary: Delete a user from a company
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *       404:
 *         description: User not found
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { companyId, uid } = req.params;
    
    // Check if user exists and belongs to the company
    const user = await prisma.user.findFirst({
      where: {
        id: uid,
        companyId
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found in this company' });
    }
    
    // Don't allow deleting SUPER users
    if (user.role === Role.SUPER) {
      return res.status(403).json({ error: 'Super users cannot be deleted' });
    }
    
    // Soft delete the user
    await prisma.user.update({
      where: { id: uid },
      data: {
        isActive: false,
        deletedAt: new Date()
      }
    });
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}; 