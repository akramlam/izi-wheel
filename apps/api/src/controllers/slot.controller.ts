import { Request, Response } from 'express';
import prisma from '../utils/db';
import { z } from 'zod';
import { createError } from '../middlewares/error.middleware';

// Validation schema for creating/updating a slot
const slotSchema = z.object({
  label: z.string().min(1).max(100),
  weight: z.number().int().min(1),
  prizeCode: z.string().min(1).max(50),
});

// Validation schema for bulk slot creation/update
const bulkSlotSchema = z.array(slotSchema).min(2);

/**
 * @openapi
 * /companies/{companyId}/wheels/{wheelId}/slots:
 *   get:
 *     summary: Get all slots for a wheel
 *     tags:
 *       - Slots
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the company
 *       - in: path
 *         name: wheelId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the wheel
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of slots for the wheel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 slots:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       label:
 *                         type: string
 *                       probability:
 *                         type: integer
 *                       prizeCode:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wheel not found
 */
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
      where: { wheelId, isActive: true },
      orderBy: { weight: 'desc' },
    });

    console.log(`Found ${slots.length} active slots for wheel ${wheelId}`);

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
 * @openapi
 * /companies/{companyId}/wheels/{wheelId}/slots/{slotId}:
 *   get:
 *     summary: Get a specific slot
 *     tags:
 *       - Slots
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the company
 *       - in: path
 *         name: wheelId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the wheel
 *       - in: path
 *         name: slotId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the slot
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A specific slot
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 slot:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     label:
 *                       type: string
 *                     probability:
 *                       type: integer
 *                     prizeCode:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wheel or slot not found
 */
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
 * @openapi
 * /companies/{companyId}/wheels/{wheelId}/slots:
 *   post:
 *     summary: Create a new slot
 *     tags:
 *       - Slots
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the company
 *       - in: path
 *         name: wheelId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the wheel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - label
 *               - probability
 *               - prizeCode
 *             properties:
 *               label:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               probability:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *               prizeCode:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Slot created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 slot:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     label:
 *                       type: string
 *                     probability:
 *                       type: integer
 *                     prizeCode:
 *                       type: string
 *                 totalProbability:
 *                   type: integer
 *                 remaining:
 *                   type: integer
 *       400:
 *         description: Invalid input or total probability would exceed 100
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wheel not found
 */
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
      select: { weight: true },
    });
    
    const currentTotal = existingSlots.reduce((sum, slot) => sum + slot.weight, 0);
    const newTotal = currentTotal + validatedData.weight;
    
    if (newTotal > 100) {
      throw createError(
        `Total probability would exceed 100 (current: ${currentTotal}, new: ${validatedData.weight})`,
        400
      );
    }
    
    // Create the slot
    const slot = await prisma.slot.create({
      data: {
        ...validatedData,
        wheelId,
        isActive: true,
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
 * @openapi
 * /companies/{companyId}/wheels/{wheelId}/slots/{slotId}:
 *   put:
 *     summary: Update an existing slot
 *     tags:
 *       - Slots
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the company
 *       - in: path
 *         name: wheelId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the wheel
 *       - in: path
 *         name: slotId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the slot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               probability:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *               prizeCode:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Slot updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 slot:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     label:
 *                       type: string
 *                     probability:
 *                       type: integer
 *                     prizeCode:
 *                       type: string
 *                 totalProbability:
 *                   type: integer
 *                 remaining:
 *                   type: integer
 *       400:
 *         description: Invalid input or total probability would exceed 100
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wheel or slot not found
 */
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
    if (validatedData.weight !== undefined) {
      // Get all other slots
      const otherSlots = await prisma.slot.findMany({
        where: {
          wheelId,
          id: { not: slotId },
        },
        select: { weight: true },
      });
      
      const otherTotal = otherSlots.reduce((sum, slot) => sum + slot.weight, 0);
      const newTotal = otherTotal + validatedData.weight;
      
      if (newTotal > 100) {
        throw createError(
          `Total probability would exceed 100 (other slots: ${otherTotal}, new: ${validatedData.weight})`,
          400
        );
      }
    }
    
    // Update the slot
    const slot = await prisma.slot.update({
      where: {
        id: slotId,
      },
      data: {
        ...validatedData,
        isActive: true,
      },
    });

    // Get the new total probability
    const allSlots = await prisma.slot.findMany({
      where: { wheelId },
      select: { weight: true },
    });
    
    const totalProbability = allSlots.reduce((sum, slot) => sum + slot.weight, 0);

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
 * @openapi
 * /companies/{companyId}/wheels/{wheelId}/slots/{slotId}:
 *   delete:
 *     summary: Delete a slot
 *     tags:
 *       - Slots
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the company
 *       - in: path
 *         name: wheelId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the wheel
 *       - in: path
 *         name: slotId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the slot
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Slot deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalProbability:
 *                   type: integer
 *                 remaining:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wheel or slot not found
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
      select: { weight: true },
    });
    
    const totalProbability = remainingSlots.reduce((sum, slot) => sum + slot.weight, 0);

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
 * @openapi
 * /companies/{companyId}/wheels/{wheelId}/slots/bulk:
 *   post:
 *     summary: Bulk create or update slots
 *     tags:
 *       - Slots
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the company
 *       - in: path
 *         name: wheelId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the wheel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             minItems: 2
 *             items:
 *               type: object
 *               required:
 *                 - label
 *                 - probability
 *                 - prizeCode
 *               properties:
 *                 label:
 *                   type: string
 *                   minLength: 1
 *                   maxLength: 100
 *                 probability:
 *                   type: integer
 *                   minimum: 1
 *                   maximum: 100
 *                 prizeCode:
 *                   type: string
 *                   minLength: 1
 *                   maxLength: 50
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Slots updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 slots:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       label:
 *                         type: string
 *                       probability:
 *                         type: integer
 *                       prizeCode:
 *                         type: string
 *       400:
 *         description: Invalid input or total probability must equal 100
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wheel not found
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
      
      // Create new slots, always set isActive: true
      const newSlots = await Promise.all(
        validatedData.map(slotData =>
          tx.slot.create({
            data: {
              ...slotData,
              isActive: true,
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