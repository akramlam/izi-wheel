import { Request, Response } from 'express';
import { WheelMode } from '@prisma/client';
import prisma from '../utils/db';
import { z } from 'zod';
import { createError } from '../middlewares/error.middleware';

// Validation schema for creating/updating a wheel
const wheelSchema = z.object({
  name: z.string().min(1).max(100),
  mode: z.nativeEnum(WheelMode),
  formSchema: z.record(z.any()).or(z.array(z.any())),
  isActive: z.boolean().optional().default(false),
});

/**
 * Get all wheels for a company
 */
export const getWheels = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw createError('Company not found', 404);
    }

    const wheels = await prisma.wheel.findMany({
      where: { companyId },
      include: {
        _count: {
          select: { slots: true, plays: true },
        },
      },
    });

    res.status(200).json({ wheels });
  } catch (error) {
    if (error instanceof Error) {
      res.status(error instanceof z.ZodError ? 400 : 500).json({ 
        error: error.message,
        details: error instanceof z.ZodError ? error.format() : undefined
      });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
};

/**
 * Get a specific wheel with its slots
 */
export const getWheel = async (req: Request, res: Response) => {
  try {
    const { companyId, wheelId } = req.params;

    const wheel = await prisma.wheel.findFirst({
      where: {
        id: wheelId,
        companyId,
      },
      include: {
        slots: true,
        _count: {
          select: { plays: true },
        },
      },
    });

    if (!wheel) {
      throw createError('Wheel not found', 404);
    }

    res.status(200).json({ wheel });
  } catch (error) {
    if (error instanceof Error) {
      res.status(error instanceof z.ZodError ? 400 : 500).json({ 
        error: error.message,
        details: error instanceof z.ZodError ? error.format() : undefined
      });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
};

/**
 * Create a new wheel
 */
export const createWheel = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    
    // Validate request body
    const validatedData = wheelSchema.parse(req.body);
    
    // Check company exists and wheel limit
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: { wheels: true },
        },
      },
    });

    if (!company) {
      throw createError('Company not found', 404);
    }

    // Check if company has reached max wheels
    if (company._count.wheels >= company.maxWheels) {
      throw createError(
        `Company has reached the maximum number of wheels (${company.maxWheels})`,
        400
      );
    }
    
    // Create the wheel
    const wheel = await prisma.wheel.create({
      data: {
        ...validatedData,
        companyId,
      },
    });

    res.status(201).json({ wheel });
  } catch (error) {
    if (error instanceof Error) {
      res.status(error instanceof z.ZodError ? 400 : 500).json({ 
        error: error.message,
        details: error instanceof z.ZodError ? error.format() : undefined
      });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
};

/**
 * Update an existing wheel
 */
export const updateWheel = async (req: Request, res: Response) => {
  try {
    const { companyId, wheelId } = req.params;
    
    // Validate request body
    const validatedData = wheelSchema.partial().parse(req.body);
    
    // Check wheel exists and belongs to company
    const existingWheel = await prisma.wheel.findFirst({
      where: {
        id: wheelId,
        companyId,
      },
    });

    if (!existingWheel) {
      throw createError('Wheel not found', 404);
    }
    
    // Update the wheel
    const wheel = await prisma.wheel.update({
      where: {
        id: wheelId,
      },
      data: validatedData,
    });

    res.status(200).json({ wheel });
  } catch (error) {
    if (error instanceof Error) {
      res.status(error instanceof z.ZodError ? 400 : 500).json({ 
        error: error.message,
        details: error instanceof z.ZodError ? error.format() : undefined
      });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
};

/**
 * Delete a wheel
 */
export const deleteWheel = async (req: Request, res: Response) => {
  try {
    const { companyId, wheelId } = req.params;
    
    // Check wheel exists and belongs to company
    const existingWheel = await prisma.wheel.findFirst({
      where: {
        id: wheelId,
        companyId,
      },
    });

    if (!existingWheel) {
      throw createError('Wheel not found', 404);
    }
    
    // Delete the wheel (cascade will delete slots and plays)
    await prisma.wheel.delete({
      where: {
        id: wheelId,
      },
    });

    res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
}; 