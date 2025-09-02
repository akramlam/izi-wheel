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
        name: true,
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
 *               forceUpdate:
 *                 type: boolean
 *                 description: If true, will update an existing user's company ID even if they already belong to another company
 *     responses:
 *       201:
 *         description: User invited
 *       200:
 *         description: User updated with new company
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Email already in use
 */
export const inviteUser = async (req: Request, res: Response) => {
  try {
    console.log('--- Starting inviteUser ---');
    const { companyId } = req.params;
    const { email, role, name, isActive = true, forceUpdate = false } = req.body;
    const adminUser = req.user; // The current authenticated user
    
    console.log('Invite user request:', { 
      companyId, 
      email, 
      role, 
      name, 
      isActive,
      forceUpdate,
      adminUser: adminUser ? { id: adminUser.id, email: adminUser.email } : null
    });
    
    // Validate required fields
    if (!email) {
      console.log('Email validation failed - no email provided');
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Validate role
    if (role !== Role.SUB && role !== Role.ADMIN) {
      console.log(`Role validation failed - invalid role: ${role}`);
      return res.status(400).json({ 
        error: 'Invalid role. Must be either SUB or ADMIN' 
      });
    }
    
    // Check if email is already in use
    let existingUser;
    try {
      existingUser = await prisma.user.findFirst({
        where: {
          email
        }
      });
      
      if (existingUser) {
        console.log(`Email already in use: ${email}`);
        
        // If the user exists but with a different company, update their company ID
        if (forceUpdate || existingUser.companyId !== companyId) {
          console.log(`Updating user ${email} to new company ID: ${companyId}`);
          
          const updatedUser = await prisma.user.update({
            where: { id: existingUser.id },
            data: { 
              companyId,
              role, // Update role if provided
              name: name || existingUser.name, // Update name if provided
              isActive: true // Ensure user is active
            }
          });
          
          const { password, ...userWithoutPassword } = updatedUser;
          
          return res.status(200).json({
            user: userWithoutPassword,
            message: 'User updated with new company successfully.'
          });
        }
        
        return res.status(409).json({ error: 'Email already in use. Please use a different email address.' });
      }
    } catch (findError) {
      console.error('Error checking for existing user:', findError);
      return res.status(500).json({ error: 'Failed to check for existing users' });
    }
    
    // Check if company exists
    let company;
    try {
      company = await prisma.company.findUnique({
        where: { id: companyId }
      });
      
      if (!company) {
        console.log(`Company not found with ID: ${companyId}`);
        return res.status(404).json({ error: 'Company not found' });
      }
      
      console.log(`Found company: ${company.name} (${company.id})`);
    } catch (companyError) {
      console.error('Error finding company:', companyError);
      return res.status(500).json({ error: 'Failed to find company' });
    }
    
    // Generate a temporary password
    let tempPassword, hashedPassword;
    try {
      tempPassword = generateRandomPassword();
      console.log(`Generated temporary password for ${email}`);
      
      hashedPassword = await hashPassword(tempPassword);
      console.log('Password hashed successfully');
    } catch (passwordError) {
      console.error('Error generating/hashing password:', passwordError);
      return res.status(500).json({ error: 'Failed to process password' });
    }
    
    // Log the user we're about to create
    console.log('Creating user with data:', { 
      name: name || "", 
      email, 
      role, 
      companyId, 
      isActive 
    });
    
    let user;
    try {
      // Create user with simpler object to avoid any potential issues
      user = await prisma.user.create({
        data: {
          name: name || "",
          email: email,
          password: hashedPassword,
          role: role,
          companyId: companyId,
          isActive: true,
          forcePasswordChange: true
        }
      });
      
      console.log('User created successfully:', user.id);
    } catch (dbError) {
      console.error('Database error creating user:', dbError);
      // Log the full error details to see what's happening
      console.error('Full error details:', JSON.stringify(dbError, null, 2));
      return res.status(500).json({ error: 'Failed to create user in database' });
    }
    
    // Get admin name from user object if available
    const adminName = adminUser?.name || adminUser?.email?.split('@')[0] || 'L\'administrateur';
    
    let emailSent = false;
    let emailError = null;
    
    try {
      // Send invite email with temporary password
      await sendInviteEmail(email, tempPassword, company.name, adminName, name, companyId, user.id);
      console.log('Invitation email sent successfully');
      emailSent = true;
    } catch (error) {
      // Log the error but don't fail the request - user is already created
      console.error('Failed to send invitation email:', error);
      emailError = error instanceof Error ? error.message : 'Unknown email error';
      emailSent = false;
    }
    
    // Return user without password
    try {
      const { password, ...userWithoutPassword } = user;
      console.log('Returning successful response');
      
      const response: any = { 
        user: userWithoutPassword,
        emailSent,
        // Always include the temporary password in the API response for admins
        // so they can securely share it if email delivery fails (or in test mode)
        tempPassword,
        message: emailSent 
          ? 'Utilisateur créé avec succès. Email d\'invitation envoyé.'
          : 'Utilisateur créé avec succès, mais l\'email d\'invitation a échoué.'
      };
      
      // Include email error details if there was an issue
      if (emailError) {
        response.emailError = emailError;
        response.tempPassword = tempPassword; // Include temp password in response if email failed
      }
      
      return res.status(201).json(response);
    } catch (responseError) {
      console.error('Error creating response:', responseError);
      // User is created but we have a problem with the response
      return res.status(201).json({ 
        message: 'Utilisateur créé avec succès, mais erreur de réponse.',
        emailSent: false,
        tempPassword: tempPassword // Include temp password as fallback
      });
    }
  } catch (error) {
    console.error('Invite user error (outer catch):', error);
    return res.status(500).json({ error: 'Failed to invite user' });
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
    const { name, email, role, isActive } = req.body;
    
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
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role }),
        ...(isActive !== undefined ? { isActive } : {})
      },
      select: {
        id: true,
        name: true,
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
    
    // Hard delete the user (completely remove from database)
    await prisma.user.delete({
      where: { id: uid }
    });
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

/**
 * @openapi
 * /companies/{companyId}/users/{userId}/reset-password:
 *   put:
 *     summary: Reset a user's password
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
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: User not found
 */
export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const { companyId, uid } = req.params;
    const { password } = req.body;
    
    if (!password || password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      });
    }
    
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
    
    // Don't allow resetting SUPER user passwords
    if (user.role === Role.SUPER) {
      return res.status(403).json({ error: 'Super user passwords cannot be reset' });
    }
    
    // Hash the new password
    const hashedPassword = await hashPassword(password);
    
    // Update the user's password and set forcePasswordChange to true
    await prisma.user.update({
      where: { id: uid },
      data: {
        password: hashedPassword,
        forcePasswordChange: true
      }
    });
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset user password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}; 