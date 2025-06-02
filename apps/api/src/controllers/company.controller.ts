import { Request, Response } from 'express';
import prisma from '../utils/db';
import { subDays, format } from 'date-fns';
import { Plan, Role } from '@prisma/client';
import { hashPassword, generateRandomPassword } from '../utils/auth';
import { sendInviteEmail } from '../utils/mailer';
import { z } from 'zod';
import { createError } from '../middlewares/error.middleware';

export const getCompanyStatistics = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { range, from, to } = req.query;
    
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
    
    // Handle range parameter (7d, 30d, 90d, all)
    if (range) {
      if (range === '7d') {
        fromDate = subDays(new Date(), 6);
      } else if (range === '30d') {
        fromDate = subDays(new Date(), 29);
      } else if (range === '90d') {
        fromDate = subDays(new Date(), 89);
      } else if (range === 'all') {
        fromDate = new Date(0); // Beginning of time
      }
    } else if (from) {
      // If explicit from date is provided, use it
      fromDate = new Date(from as string);
    }
    
    if (to) {
      toDate = new Date(to as string);
    }
    
    // Total wheels and active wheels
    const wheels = await prisma.wheel.findMany({
      where: { companyId },
      select: { id: true, isActive: true },
    }) || [];
    const totalWheels = wheels.length;
    const activeWheels = wheels.filter(w => w.isActive).length;

    // Total plays and prizes with date filter
    let totalPlays = 0;
    try {
      const playsResult = await prisma.play.count({
        where: { 
          wheel: { companyId },
          createdAt: { 
            gte: fromDate,
            lte: toDate
          }
        },
      });
      totalPlays = playsResult || 0;
    } catch (error) {
      console.error('Error counting plays:', error);
      totalPlays = 0;
    }
    
    // Count winning plays (prizes)
    let totalPrizes = 0;
    try {
      const prizesResult = await prisma.play.count({
        where: { 
          wheel: { companyId },
          result: 'WIN',
          createdAt: { 
            gte: fromDate,
            lte: toDate
          }
        },
      });
      totalPrizes = prizesResult || 0;
    } catch (error) {
      console.error('Error counting prizes:', error);
      totalPrizes = 0;
    }

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
    }) || [];
    
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
    
    // Get winning plays (prizes) grouped by day
    const winningPlays = await prisma.play.findMany({
      where: {
        wheel: { companyId },
        result: 'WIN',
        createdAt: { 
          gte: fromDate,
          lte: toDate
        }
      },
      include: {
        slot: true
      }
    }) || [];
    
    // Populate prizesByDay with actual counts
    winningPlays.forEach(play => {
      const dateStr = format(play.createdAt, 'yyyy-MM-dd');
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
        slot: true
      },
    }) || [];

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
    // Get the company ID from the URL parameter
    const companyId = req.params.companyId || req.params.id;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const { name, plan, maxWheels, isActive } = req.body;

    console.log('Updating company:', { companyId, name, plan, maxWheels, isActive });

    // Validate the plan value if provided
    if (plan !== undefined) {
      if (!(plan === Plan.BASIC || plan === Plan.PREMIUM)) {
        return res.status(400).json({
          error: 'Invalid plan value. Must be one of: BASIC, PREMIUM' 
        });
      }
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        name,
        plan,
        maxWheels,
        isActive,
      },
    });

    res.json({ company });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.format() });
    }
    console.error('Update company error:', error);
    res.status(500).json({ error: 'Failed to update company' });
  }
};

export const createCompany = async (req: Request, res: Response) => {
  try {
    const { name, plan, maxWheels, admins } = req.body;

    // Validate plan
    if (plan && !(plan === Plan.BASIC || plan === Plan.PREMIUM)) {
      return res.status(400).json({
        error: 'Invalid plan. Must be BASIC or PREMIUM.'
      });
    }

    // Check if company with the same name already exists
    const existingCompany = await prisma.company.findFirst({
      where: { name },
    });

    if (existingCompany) {
      return res.status(400).json({ error: 'A company with this name already exists. Please use a different name.' });
    }

    // Validate admins array
    if (admins && !Array.isArray(admins)) {
      return res.status(400).json({ error: 'Admins must be an array' });
    }

    // Creating company with validated data
    const companyData = {
      name,
      plan: plan || Plan.BASIC, // Default to BASIC if not provided
      maxWheels: maxWheels || 5, // Default to 5 if not provided
    };

    const company = await prisma.company.create({
      data: companyData,
    });

    // Create admin users if provided
    let createdAdmins: any[] = [];
    if (admins && admins.length > 0) {
      for (const admin of admins) {
        if (!admin.email || !admin.role) {
          console.warn('Skipping admin creation due to missing email or role:', admin);
          continue; // Skip if essential fields are missing
        }
        const tempPassword = generateRandomPassword();
        const hashedPassword = await hashPassword(tempPassword);
        try {
          const newUser = await prisma.user.create({
            data: {
              name: admin.name || '',
              email: admin.email,
              password: hashedPassword,
              role: admin.role as Role,
              companyId: company.id,
              forcePasswordChange: true,
            },
          });
          // Send invitation email
          await sendInviteEmail(admin.email, tempPassword, company.name, req.user?.name, admin.name);
          const { password, ...adminWithoutPassword } = newUser;
          createdAdmins.push(adminWithoutPassword);
        } catch (userError) {
          console.error(`Failed to create admin user ${admin.email}:`, userError);
          // Potentially collect these errors to send back in response if needed
        }
      }
    }

    res.status(201).json({ company, admins: createdAdmins });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.format() });
    }
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

export const updateCompanyPlan = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { plan } = req.body;

    if (!(plan === Plan.BASIC || plan === Plan.PREMIUM)) {
      return res.status(400).json({
        error: 'Invalid plan. Must be BASIC or PREMIUM.'
      });
    }

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: { plan },
    });

    res.json({ company: updatedCompany });
  } catch (error) {
    console.error('Update company plan error:', error);
    res.status(500).json({ error: 'Failed to update company plan' });
  }
}; 

export const getCompany = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({ company });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
};  