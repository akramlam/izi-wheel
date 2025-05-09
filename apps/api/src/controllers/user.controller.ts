import { Request, Response } from 'express';
import prisma from '../utils/db';
import { Role } from '@prisma/client';
import { hashPassword } from '../utils/auth';
import { generateRandomPassword } from '../utils/auth';
import { sendInviteEmail } from '../utils/mailer';

/**
 * Get all users for a company
 */
export const getCompanyUsers = async (req: Request, res: Response) => {
  try {
    const { cid } = req.params;
    
    const users = await prisma.user.findMany({
      where: {
        companyId: cid
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
 * Invite a new user to a company
 */
export const inviteUser = async (req: Request, res: Response) => {
  try {
    const { cid } = req.params;
    const { email, role } = req.body;
    
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
        companyId: cid
      }
    });
    
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use in this company' });
    }
    
    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: cid }
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
        email,
        password: hashedPassword,
        role,
        companyId: cid,
        isActive: true
      }
    });
    
    // Send invite email with temporary password
    await sendInviteEmail(email, tempPassword, company.name);
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    res.status(201).json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
};

/**
 * Update a user's role or active status
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { cid, uid } = req.params;
    const { role, isActive } = req.body;
    
    // Check if user exists and belongs to the company
    const user = await prisma.user.findFirst({
      where: {
        id: uid,
        companyId: cid
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
 * Soft delete a user
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { cid, uid } = req.params;
    
    // Check if user exists and belongs to the company
    const user = await prisma.user.findFirst({
      where: {
        id: uid,
        companyId: cid
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found in this company' });
    }
    
    // Soft delete by setting isActive to false and recording deletion time
    const deletedUser = await prisma.user.update({
      where: { id: uid },
      data: {
        isActive: false,
        deletedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        deletedAt: true
      }
    });
    
    res.json({ 
      message: 'User deleted successfully', 
      user: deletedUser 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}; 