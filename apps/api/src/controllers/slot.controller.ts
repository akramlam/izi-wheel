import { Request, Response } from 'express';
import prisma from '../utils/db';
import { z } from 'zod';
import { createError } from '../middlewares/error.middleware';

// Validation schema for creating/updating a slot
const slotSchema = z.object({
  label: z.string().min(1).max(100),
  probability: z.number().int().min(1).max(100),
  prizeCode: z.string().min(1).max(50),
});

// Validation schema for bulk slot creation/update
const bulkSlotSchema = z.array(slotSchema).min(2).refine(
  (slots) => {
    const totalProbability = slots.reduce((sum, slot) => sum + slot.probability, 0);
    return totalProbability === 100;
  },
  {
    message: 'Total probability must equal 100',
    path: ['probability'],
  }
);

/**
 * Get all slots for a wheel
 */
export const getSlots = async (req: Request, res: Response) => {
  try {
    const { companyId, wheelId } = req.params;

    // Verify wheel exists and belongs to company
    const wheel = await prisma.wheel.findFirst({
      where: {
        id: wheelId,
        companyId,
      },
    });

    if (!wheel) {
      throw createError('Wheel not found', 404);
    }

    const slots = await prisma.slot.findMany({
      where: { wheelId },
      orderBy: { probability: 'desc' },
    });

    res.status(200).json({ slots });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
};

/**
 * Get a specific slot
 */
export const getSlot = async (req: Request, res: Response) => {
  try {
    const { companyId, wheelId, slotId } = req.params;

    // Verify wheel exists and belongs to company
    const wheel = await prisma.wheel.findFirst({
      where: {
        id: wheelId,
        companyId,
      },
    });

    if (!wheel) {
      throw createError('Wheel not found', 404);
    }

    const slot = await prisma.slot.findFirst({
      where: {
        id: slotId,
        wheelId,
      },
    });

    if (!slot) {
      throw createError('Slot not found', 404);
    }

    res.status(200).json({ slot });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
};

/**
 * Create a new slot
 */
export const createSlot = async (req: Request, res: Response) => {
  try {
    const { companyId, wheelId } = req.params;
    
    // Validate request body
    const validatedData = slotSchema.parse(req.body);
    
    // Verify wheel exists and belongs to company
    const wheel = await prisma.wheel.findFirst({
      where: {
        id: wheelId,
        companyId,
      },
    });

    if (!wheel) {
      throw createError('Wheel not found', 404);
    }
    
    // Get existing slots to verify total probability
    const existingSlots = await prisma.slot.findMany({
      where: { wheelId },
      select: { probability: true },
    });
    
    const currentTotal = existingSlots.reduce((sum, slot) => sum + slot.probability, 0);
    const newTotal = currentTotal + validatedData.probability;
    
    if (newTotal > 100) {
      throw createError(
        `Total probability would exceed 100 (current: ${currentTotal}, new: ${validatedData.probability})`,
        400
      );
    }
    
    // Create the slot
    const slot = await prisma.slot.create({
      data: {
        ...validatedData,
        wheelId,
      },
    });

    res.status(201).json({ 
      slot,
      totalProbability: newTotal,
      remaining: 100 - newTotal
    });
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
 * Update an existing slot
 */
export const updateSlot = async (req: Request, res: Response) => {
  try {
    const { companyId, wheelId, slotId } = req.params;
    
    // Validate request body
    const validatedData = slotSchema.partial().parse(req.body);
    
    // Verify wheel and slot exist
    const wheel = await prisma.wheel.findFirst({
      where: {
        id: wheelId,
        companyId,
      },
    });

    if (!wheel) {
      throw createError('Wheel not found', 404);
    }
    
    const existingSlot = await prisma.slot.findFirst({
      where: {
        id: slotId,
        wheelId,
      },
    });

    if (!existingSlot) {
      throw createError('Slot not found', 404);
    }
    
    // If probability is being updated, verify total probability
    if (validatedData.probability !== undefined) {
      // Get all other slots
      const otherSlots = await prisma.slot.findMany({
        where: {
          wheelId,
          id: { not: slotId },
        },
        select: { probability: true },
      });
      
      const otherTotal = otherSlots.reduce((sum, slot) => sum + slot.probability, 0);
      const newTotal = otherTotal + validatedData.probability;
      
      if (newTotal > 100) {
        throw createError(
          `Total probability would exceed 100 (other slots: ${otherTotal}, new: ${validatedData.probability})`,
          400
        );
      }
    }
    
    // Update the slot
    const slot = await prisma.slot.update({
      where: {
        id: slotId,
      },
      data: validatedData,
    });

    // Get the new total probability
    const allSlots = await prisma.slot.findMany({
      where: { wheelId },
      select: { probability: true },
    });
    
    const totalProbability = allSlots.reduce((sum, slot) => sum + slot.probability, 0);

    res.status(200).json({ 
      slot,
      totalProbability,
      remaining: 100 - totalProbability
    });
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
 * Delete a slot
 */
export const deleteSlot = async (req: Request, res: Response) => {
  try {
    const { companyId, wheelId, slotId } = req.params;
    
    // Verify wheel and slot exist
    const wheel = await prisma.wheel.findFirst({
      where: {
        id: wheelId,
        companyId,
      },
    });

    if (!wheel) {
      throw createError('Wheel not found', 404);
    }
    
    const existingSlot = await prisma.slot.findFirst({
      where: {
        id: slotId,
        wheelId,
      },
    });

    if (!existingSlot) {
      throw createError('Slot not found', 404);
    }
    
    // Delete the slot
    await prisma.slot.delete({
      where: {
        id: slotId,
      },
    });

    // Get the new total probability
    const remainingSlots = await prisma.slot.findMany({
      where: { wheelId },
      select: { probability: true },
    });
    
    const totalProbability = remainingSlots.reduce((sum, slot) => sum + slot.probability, 0);

    res.status(200).json({ 
      message: 'Slot deleted successfully',
      totalProbability,
      remaining: 100 - totalProbability
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
};

/**
 * Bulk create or update slots
 */
export const bulkUpdateSlots = async (req: Request, res: Response) => {
  try {
    const { companyId, wheelId } = req.params;
    
    // Validate request body
    const validatedData = bulkSlotSchema.parse(req.body);
    
    // Verify wheel exists and belongs to company
    const wheel = await prisma.wheel.findFirst({
      where: {
        id: wheelId,
        companyId,
      },
    });

    if (!wheel) {
      throw createError('Wheel not found', 404);
    }
    
    // Get existing slots
    const existingSlots = await prisma.slot.findMany({
      where: { wheelId },
    });
    
    // Start a transaction to ensure atomic updates
    const result = await prisma.$transaction(async (tx) => {
      // Delete all existing slots
      if (existingSlots.length > 0) {
        await tx.slot.deleteMany({
          where: { wheelId },
        });
      }
      
      // Create new slots
      const newSlots = await Promise.all(
        validatedData.map(slotData =>
          tx.slot.create({
            data: {
              ...slotData,
              wheelId,
            },
          })
        )
      );
      
      return newSlots;
    });
    
    res.status(200).json({ 
      slots: result,
      totalProbability: 100,
      remaining: 0
    });
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