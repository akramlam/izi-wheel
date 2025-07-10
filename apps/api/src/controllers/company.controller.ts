import { Request, Response } from 'express';
import prisma from '../utils/db';
import { subDays, format } from 'date-fns';
import { Plan as PrismaClientPlan, Role } from '@prisma/client';
import { hashPassword, generateRandomPassword } from '../utils/auth';
import { sendInviteEmail } from '../utils/mailer';
import { z } from 'zod';
import { createError } from '../middlewares/error.middleware';

// Define a local version of the Plan enum that includes FREE
// This is necessary until Prisma client is regenerated with the updated schema
enum Plan {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM'
}

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

    // Generate dates for the selected period
    const generateDatesForPeriod = (from: Date, to: Date) => {
      const dates = [];
      const current = new Date(from);
      const end = new Date(to);
      
      // Calculate the number of days
      const diffTime = Math.abs(end.getTime() - from.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // For periods longer than 90 days, group by weeks
      if (diffDays > 90) {
        // Group by weeks for very long periods
        const startOfWeek = new Date(from);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        
        const currentWeek = new Date(startOfWeek);
        while (currentWeek <= end) {
          dates.push(format(currentWeek, 'yyyy-MM-dd'));
          currentWeek.setDate(currentWeek.getDate() + 7);
        }
      } else {
        // Daily granularity for shorter periods
        while (current <= end) {
          dates.push(format(current, 'yyyy-MM-dd'));
          current.setDate(current.getDate() + 1);
        }
      }
      
      return dates;
    };

    const dates = generateDatesForPeriod(fromDate, toDate);

    // Helper function to group data by date range
    const groupDataByDateRange = (data: any[], dates: string[], isWeeklyGrouping: boolean) => {
      const grouped = dates.map(date => ({ date, count: 0 }));
      
      data.forEach(item => {
        const itemDate = new Date(item.createdAt);
        
        if (isWeeklyGrouping) {
          // For weekly grouping, find the week that contains this date
          const itemWeekStart = new Date(itemDate);
          itemWeekStart.setDate(itemWeekStart.getDate() - itemWeekStart.getDay());
          const weekStr = format(itemWeekStart, 'yyyy-MM-dd');
          
          const weekIndex = grouped.findIndex(g => g.date === weekStr);
          if (weekIndex >= 0) {
            grouped[weekIndex].count++;
          }
        } else {
          // For daily grouping, match exact date
          const dateStr = format(itemDate, 'yyyy-MM-dd');
          const dayIndex = grouped.findIndex(g => g.date === dateStr);
          if (dayIndex >= 0) {
            grouped[dayIndex].count++;
          }
        }
      });
      
      return grouped;
    };

    // Determine if we're using weekly grouping
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isWeeklyGrouping = diffDays > 90;

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
    
    // Group the data correctly
    const playsByDay = groupDataByDateRange(plays, dates, isWeeklyGrouping);
    const prizesByDay = groupDataByDateRange(winningPlays, dates, isWeeklyGrouping);

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

    // Prize distribution data for the doughnut chart
    const prizeDistribution = await prisma.play.findMany({
      where: {
        wheel: { companyId },
        result: 'WIN',
        createdAt: { 
          gte: fromDate,
          lte: toDate
        }
      },
      include: {
        slot: {
          select: {
            label: true,
            prizeCode: true
          }
        }
      }
    });

    // Group prizes by type for the chart
    const prizeGroups = prizeDistribution.reduce((acc, play) => {
      const key = play.slot?.label || 'Unknown Prize';
      const code = play.slot?.prizeCode || 'N/A';
      if (!acc[key]) {
        acc[key] = { label: key, prizeCode: code, count: 0 };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, { label: string; prizeCode: string; count: number }>);

    const prizeDistributionData = Object.values(prizeGroups);

    // Wheel performance data for the bar chart
    const wheelPerformanceData = await prisma.wheel.findMany({
      where: { companyId },
      include: {
        _count: {
          select: {
            plays: {
              where: {
                createdAt: { 
                  gte: fromDate,
                  lte: toDate
                }
              }
            }
          }
        },
        plays: {
          where: {
            result: 'WIN',
            createdAt: { 
              gte: fromDate,
              lte: toDate
            }
          },
          select: { id: true }
        }
      }
    });

    const wheelPerformance = wheelPerformanceData.map(wheel => ({
      wheelId: wheel.id,
      wheelName: wheel.name,
      plays: wheel._count.plays,
      prizes: wheel.plays.length,
      conversion: wheel._count.plays > 0 ? (wheel.plays.length / wheel._count.plays) * 100 : 0
    }));

    res.json({
      totalWheels,
      activeWheels,
      totalPlays,
      totalPrizes,
      playsByDay,
      prizesByDay,
      prizeDistribution: prizeDistributionData,
      wheelPerformance,
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

    const { name, plan, maxWheels, isActive, admins } = req.body;

    console.log('Updating company:', { companyId, name, plan, maxWheels, isActive, admins });

    // Validate the plan value if provided
    if (plan !== undefined) {
      if (!(plan === Plan.BASIC || plan === Plan.PREMIUM || plan === Plan.FREE)) {
        return res.status(400).json({
          error: 'Invalid plan value. Must be one of: FREE, BASIC, PREMIUM' 
        });
      }
    }

    // Validate admins array if provided
    if (admins && !Array.isArray(admins)) {
      return res.status(400).json({ error: 'Admins must be an array' });
    }

    // First, get the company to use its name for email invitations
    const existingCompany = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!existingCompany) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Update the company
    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        name,
        plan,
        maxWheels,
        isActive,
      },
    });

    // Create admin users if provided (same logic as createCompany)
    let createdAdmins: any[] = [];
    if (admins && admins.length > 0) {
      console.log(`Processing ${admins.length} admin invitations for company update`);
      
      for (const admin of admins) {
        if (!admin.email || !admin.role) {
          console.warn('Skipping admin creation due to missing email or role:', admin);
          continue; // Skip if essential fields are missing
        }
        
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: { email: admin.email }
        });
        
        if (existingUser) {
          console.log(`User ${admin.email} already exists, skipping invitation`);
          continue;
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
          console.log(`Sending invitation email to ${admin.email} for company ${company.name}`);
          await sendInviteEmail(
            admin.email, 
            tempPassword, 
            company.name, 
            req.user?.name, 
            admin.name,
            company.id,
            newUser.id
          );
          
          const { password, ...adminWithoutPassword } = newUser;
          createdAdmins.push(adminWithoutPassword);
          console.log(`Successfully created and invited admin: ${admin.email}`);
        } catch (userError) {
          console.error(`Failed to create admin user ${admin.email}:`, userError);
          // Continue with other admins even if one fails
        }
      }
    }

    console.log(`Company update completed. Created ${createdAdmins.length} new admin(s)`);
    res.json({ company, admins: createdAdmins });
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
    if (plan && !(plan === Plan.BASIC || plan === Plan.PREMIUM || plan === Plan.FREE)) {
      return res.status(400).json({
        error: 'Invalid plan. Must be one of: FREE, BASIC, PREMIUM.'
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
    const { force } = req.query; // Check for force parameter

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id },
      include: { 
        wheels: true, // Get all wheels, not just active ones
        admins: true,
        _count: {
          select: {
            wheels: true,
            admins: true,
            // Add any other relations that might exist
          }
        }
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // If not forcing deletion, check for active wheels
    if (force !== 'true') {
      const activeWheels = company.wheels.filter(wheel => wheel.isActive);
      
      if (activeWheels.length > 0) {
        return res.status(409).json({ 
          error: 'Cannot delete company with active wheels',
          details: {
            companyName: company.name,
            activeWheelsCount: activeWheels.length,
            totalWheelsCount: company.wheels.length,
            adminsCount: company.admins.length,
            message: `L'entreprise "${company.name}" contient ${activeWheels.length} roue(s) active(s) et ${company.admins.length} administrateur(s). Pour supprimer définitivement cette entreprise et toutes ses données, vous devez confirmer en tapant le nom exact de l'entreprise.`
          }
        });
      }
    }

    // Force deletion - delete all related data
    if (force === 'true') {
      console.log(`[FORCE DELETE] Deleting company "${company.name}" and all related data...`);
      
      // Delete all wheels and their associated data (slots, plays, etc.)
      for (const wheel of company.wheels) {
        // Delete wheel slots first
        await prisma.slot.deleteMany({
          where: { wheelId: wheel.id }
        });
        
        // Delete wheel plays
        await prisma.play.deleteMany({
          where: { wheelId: wheel.id }
        });
        
        // Delete the wheel
        await prisma.wheel.delete({
          where: { id: wheel.id }
        });
        
        console.log(`[FORCE DELETE] Deleted wheel: ${wheel.name}`);
      }
      
      // Delete all company admins
      await prisma.user.deleteMany({
        where: { companyId: id }
      });
      
      console.log(`[FORCE DELETE] Deleted ${company.admins.length} admin(s)`);
    }

    // Finally delete the company
    await prisma.company.delete({
      where: { id }
    });

    const message = force === 'true' 
      ? `Company "${company.name}" and all associated data permanently deleted`
      : 'Company permanently deleted';
      
    console.log(`[DELETE] ${message}`);
    res.json({ message });
    
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
};

export const getCompanies = async (req: Request, res: Response) => {
  try {
    // Use explicit select to avoid issues with schema changes
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        plan: true,
        maxWheels: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            wheels: true,
            admins: true
          }
        }
      }
    });
    
    // Add default value for remainingPlays
    const companiesWithDefaults = companies.map(company => ({
      ...company,
      remainingPlays: 50 // Default value
    }));
    
    res.status(200).json({ companies: companiesWithDefaults });
  } catch (error) {
    console.error('Failed to fetch companies:', error);
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

    if (!(plan === Plan.BASIC || plan === Plan.PREMIUM || plan === Plan.FREE)) {
      return res.status(400).json({
        error: 'Invalid plan. Must be one of: FREE, BASIC, PREMIUM'
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