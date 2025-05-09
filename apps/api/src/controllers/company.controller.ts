import { Request, Response } from 'express';
import prisma from '../utils/db';
import { subDays, format } from 'date-fns';
import { Plan } from '@prisma/client';

export const getCompanyStatistics = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    // Total wheels and active wheels
    const wheels = await prisma.wheel.findMany({
      where: { companyId },
      select: { id: true, isActive: true },
    });
    const totalWheels = wheels.length;
    const activeWheels = wheels.filter(w => w.isActive).length;

    // Total plays and prizes
    const totalPlays = await prisma.play.count({
      where: { wheel: { companyId } },
    });
    const totalPrizes = await prisma.prize.count({
      where: { play: { wheel: { companyId } } },
    });

    // Plays by day (last 7 days)
    const playsByDay = await Promise.all(
      Array.from({ length: 7 }).map(async (_, i) => {
        const day = subDays(new Date(), 6 - i);
        const start = new Date(day.setHours(0, 0, 0, 0));
        const end = new Date(day.setHours(23, 59, 59, 999));
        const count = await prisma.play.count({
          where: {
            wheel: { companyId },
            createdAt: { gte: start, lte: end },
          },
        });
        return { date: format(start, 'yyyy-MM-dd'), count };
      })
    );

    // Prizes by day (last 7 days)
    const prizesByDay = await Promise.all(
      Array.from({ length: 7 }).map(async (_, i) => {
        const day = subDays(new Date(), 6 - i);
        const start = new Date(day.setHours(0, 0, 0, 0));
        const end = new Date(day.setHours(23, 59, 59, 999));
        const count = await prisma.prize.count({
          where: {
            play: { wheel: { companyId }, createdAt: { gte: start, lte: end } },
          },
        });
        return { date: format(start, 'yyyy-MM-dd'), count };
      })
    );

    // Recent plays (last 10)
    const recentPlays = await prisma.play.findMany({
      where: { wheel: { companyId } },
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
    const { companyId } = req.params;
    const { name, isActive } = req.body;
    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
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
    const { name, plan, maxWheels, isActive } = req.body;

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

    const company = await prisma.company.create({
      data: {
        name,
        ...(plan && { plan }),
        ...(maxWheels && { maxWheels }),
        ...(isActive !== undefined ? { isActive } : {})
      }
    });

    res.status(201).json({ company });
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

    // Soft delete the company
    const deleted = await prisma.company.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date()
      }
    });

    res.json({ message: 'Company deleted successfully', company: deleted });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
}; 