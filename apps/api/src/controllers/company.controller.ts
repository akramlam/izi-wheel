import { Request, Response } from 'express';
import prisma from '../utils/db';
import { subDays, format } from 'date-fns';
import { Plan, Role } from '@prisma/client';
import { hashPassword, generateRandomPassword } from '../utils/auth';
import { sendInviteEmail } from '../utils/mailer';

export const getCompanyStatistics = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { from, to } = req.query;
    
    // Special handling for demo-company-id (SUPER admin with no companies)
    if (companyId === 'demo-company-id' && req.user?.role === 'SUPER') {
      // Return empty statistics for demo company
      return res.json({
        totalWheels: 0,
        activeWheels: 0,
        totalPlays: 0,
        totalPrizes: 0,
        playsByDay: [],
        prizesByDay: [],
        recentPlays: [],
        dateRange: {
          from: new Date().toISOString(),
          to: new Date().toISOString()
        }
      });
    }
    
    // Parse date range if provided
    let fromDate = subDays(new Date(), 6); // Default to last 7 days
    let toDate = new Date();
    
    if (from) {
      fromDate = new Date(from as string);
    }
    
    if (to) {
      toDate = new Date(to as string);
    }
    
    // Total wheels and active wheels
    const wheels = await prisma.wheel.findMany({
      where: { companyId },
      select: { id: true, isActive: true },
    });
    const totalWheels = wheels.length;
    const activeWheels = wheels.filter(w => w.isActive).length;

    // Total plays and prizes with date filter
    const totalPlays = await prisma.play.count({
      where: { 
        wheel: { companyId },
        createdAt: { 
          gte: fromDate,
          lte: toDate
        }
      },
    });
    
    const totalPrizes = await prisma.prize.count({
      where: { 
        play: { 
          wheel: { companyId },
          createdAt: { 
            gte: fromDate,
            lte: toDate
          }
        } 
      },
    });

    // Generate dates for the last 7 days
    const dates = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      return format(date, 'yyyy-MM-dd');
    });

    // Prepare playsByDay with 0 counts
    const playsByDay = dates.map(date => ({ date, count: 0 }));
    
    // Get plays grouped by day
    const plays = await prisma.play.findMany({
      where: {
        wheel: { companyId },
        createdAt: { 
          gte: fromDate,
          lte: toDate
        }
      }
    });
    
    // Populate playsByDay with actual counts
    plays.forEach(play => {
      const dateStr = format(play.createdAt, 'yyyy-MM-dd');
      const dayIndex = playsByDay.findIndex(day => day.date === dateStr);
      if (dayIndex >= 0) {
        playsByDay[dayIndex].count++;
      }
    });

    // Prepare prizesByDay with 0 counts
    const prizesByDay = dates.map(date => ({ date, count: 0 }));
    
    // Get prizes with related plays
    const prizesWithPlays = await prisma.prize.findMany({
      where: {
        play: {
          wheel: { companyId },
          createdAt: { 
            gte: fromDate,
            lte: toDate
          }
        }
      },
      include: {
        play: true
      }
    });
    
    // Populate prizesByDay with actual counts
    prizesWithPlays.forEach(prize => {
      const dateStr = format(prize.play.createdAt, 'yyyy-MM-dd');
      const dayIndex = prizesByDay.findIndex(day => day.date === dateStr);
      if (dayIndex >= 0) {
        prizesByDay[dayIndex].count++;
      }
    });

    // Recent plays (last 10)
    const recentPlays = await prisma.play.findMany({
      where: { 
        wheel: { companyId },
        createdAt: { 
          gte: fromDate,
          lte: toDate
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        wheel: { select: { name: true } },
        prize: true,
      },
    });

    res.json({
      totalWheels,
      activeWheels,
      totalPlays,
      totalPrizes,
      playsByDay,
      prizesByDay,
      recentPlays,
      dateRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      }
    });
  } catch (error) {
    console.error('Company statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch company statistics' });
  }
};

export const getAllCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ companies });
  } catch (error) {
    console.error('Get all companies error:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
};

export const updateCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isActive, plan, maxWheels } = req.body;
    // Validate the plan value if provided
    if (plan && !Object.values(Plan).includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan value. Must be one of: BASIC, PREMIUM' });
    }
    // Validate maxWheels if provided
    if (maxWheels !== undefined && maxWheels < 1) {
      return res.status(400).json({ error: 'maxWheels must be at least 1' });
    }
    const updated = await prisma.company.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(plan && { plan }),
        ...(maxWheels !== undefined ? { maxWheels } : {}),
      },
    });
    res.json({ company: updated });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Prisma not found error
      return res.status(404).json({ error: 'Company not found' });
    }
    console.error('Update company error:', error.message || error);
    res.status(500).json({ error: 'Failed to update company' });
  }
};

export const createCompany = async (req: Request, res: Response) => {
  try {
    const { name, plan, maxWheels, isActive, admins } = req.body;

    // Validate the plan value if provided
    if (plan && !Object.values(Plan).includes(plan)) {
      return res.status(400).json({ 
        error: 'Invalid plan value. Must be one of: BASIC, PREMIUM' 
      });
    }

    // Validate maxWheels if provided
    if (maxWheels !== undefined && maxWheels < 1) {
      return res.status(400).json({ 
        error: 'maxWheels must be at least 1' 
      });
    }
    
    // Check if company name is already in use
    const existingCompany = await prisma.company.findFirst({
      where: { name }
    });
    
    if (existingCompany) {
      return res.status(409).json({ error: 'Company name already in use' });
    }

    // Create the company
    const company = await prisma.company.create({
      data: {
        name,
        ...(plan && { plan }),
        ...(maxWheels && { maxWheels }),
        ...(isActive !== undefined ? { isActive } : {})
      }
    });

    // Handle admin invitations if provided
    const adminUsers = [];
    if (admins && Array.isArray(admins) && admins.length > 0) {
      const currentUser = req.user;
      const adminName = currentUser?.name || 'Super Admin';
      
      for (const admin of admins) {
        try {
          // Validate required fields
          if (!admin.email || !admin.role) {
            console.warn('Skipping admin invitation - missing email or role', admin);
            continue;
          }
          
          // Validate role - only ADMIN or SUB roles are allowed
          if (admin.role !== Role.ADMIN && admin.role !== Role.SUB) {
            console.warn(`Skipping admin invitation - invalid role: ${admin.role}`);
            continue;
          }
          
          // Check if email is already in use in this company
          const existingUser = await prisma.user.findFirst({
            where: {
              email: admin.email,
              companyId: company.id
            }
          });
          
          if (existingUser) {
            console.warn(`User with email ${admin.email} already exists in this company`);
            continue;
          }
          
          // Generate random password
          const tempPassword = generateRandomPassword();
          const hashedPassword = await hashPassword(tempPassword);
          
          // Create the user
          const user = await prisma.user.create({
            data: {
              email: admin.email,
              password: hashedPassword,
              role: admin.role,
              companyId: company.id,
              isActive: true
            }
          });
          
          // Send invitation email without trying to update fields with problems
          await sendInviteEmail(admin.email, tempPassword, company.name, adminName, admin.name || '');
          
          // Add to list of created users (without password)
          const { password, ...userWithoutPassword } = user;
          adminUsers.push(userWithoutPassword);
        } catch (error) {
          console.error(`Failed to create admin user ${admin.email}:`, error);
          // Continue with other admins even if one fails
        }
      }
    }

    res.status(201).json({ 
      company,
      admins: adminUsers
    });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
};

export const deleteCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id },
      include: { wheels: { where: { isActive: true } } }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if company has active wheels
    if (company.wheels && company.wheels.length > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete company with active wheels' 
      });
    }

    // Hard delete the company (will cascade delete related records)
    await prisma.company.delete({
      where: { id }
    });

    res.json({ message: 'Company permanently deleted' });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
};

export const getCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany();
    res.status(200).json({ companies });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
};

/**
 * @openapi
 * /companies:
 *   get:
 *     summary: Get all companies
 *     tags:
 *       - Companies
 *     responses:
 *       200:
 *         description: List of companies
 */

/**
 * @openapi
 * /companies:
 *   post:
 *     summary: Create a new company
 *     tags:
 *       - Companies
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               plan:
 *                 type: string
 *               maxWheels:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Company created
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Company name already in use
 */

/**
 * @openapi
 * /companies/{id}/plan:
 *   patch:
 *     summary: Update a company plan
 *     tags:
 *       - Companies
 *     parameters:
 *       - in: path
 *         name: id
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
 *               plan:
 *                 type: string
 *               maxWheels:
 *                 type: integer
 *               name:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Company updated
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Company not found
 */

/**
 * @openapi
 * /companies/{id}:
 *   delete:
 *     summary: Permanently delete a company
 *     tags:
 *       - Companies
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company permanently deleted
 *       404:
 *         description: Company not found
 *       409:
 *         description: Cannot delete company with active wheels
 */

/**
 * Check if super admin has access to company
 */
export const validateSuperAdminAccess = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Super admin can access any company, return first company ID for convenience
    if (req.user.role === 'SUPER') {
      const companies = await prisma.company.findMany({
        take: 1,
        orderBy: {
          createdAt: 'asc'
        }
      });
      
      if (companies.length > 0) {
        return res.status(200).json({ 
          companyId: companies[0].id,
          companyName: companies[0].name
        });
      } else {
        // For SUPER admin with no companies, return a special demo company ID
        // This allows super admins to access pages that require a company ID
        return res.status(200).json({ 
          companyId: 'demo-company-id',
          companyName: 'Demo Company'
        });
      }
    }
    
    // Regular users must have a companyId
    if (!req.user.companyId) {
      return res.status(400).json({ error: 'No company ID found for this user' });
    }
    
    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId }
    });
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    return res.status(200).json({ 
      companyId: company.id,
      companyName: company.name
    });
  } catch (error) {
    console.error('Super admin access validation error:', error);
    return res.status(500).json({ error: 'Failed to validate company access' });
  }
}; 