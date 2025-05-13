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
 * @openapi
 * /companies/{companyId}/wheels:
 *   get:
 *     summary: Get all wheels for a company
 *     tags:
 *       - Wheels
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the company
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of wheels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 wheels:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       mode:
 *                         type: string
 *                         enum: [LEAD_GENERATION, INSTANT_WIN]
 *                       isActive:
 *                         type: boolean
 *                       _count:
 *                         type: object
 *                         properties:
 *                           slots:
 *                             type: integer
 *                           plays:
 *                             type: integer
 *       400:
 *         description: Invalid company ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Company not found
 */
/**
 * Get all wheels for a company
 */
export const getWheels = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    // Validate companyId, but allow demo-company-id for testing
    if (!companyId || companyId === 'null') {
      return res.status(400).json({ error: 'Invalid or missing companyId in URL.' });
    }

    // Special case for demo ID or validate UUID format
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (companyId !== 'demo-company-id' && !uuidRegex.test(companyId)) {
      return res.status(400).json({ error: 'Invalid companyId format.' });
    }

    // Special handling for demo-company-id (SUPER admin with no companies)
    if (companyId === 'demo-company-id' && req.user?.role === 'SUPER') {
      // Return empty wheels array for demo company
      return res.status(200).json({ wheels: [] });
    }

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
 * @openapi
 * /companies/{companyId}/wheels/{wheelId}:
 *   get:
 *     summary: Get a specific wheel with its slots
 *     tags:
 *       - Wheels
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
 *         description: A wheel with its slots
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 wheel:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     mode:
 *                       type: string
 *                       enum: [LEAD_GENERATION, INSTANT_WIN]
 *                     isActive:
 *                       type: boolean
 *                     slots:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           label:
 *                             type: string
 *                           color:
 *                             type: string
 *                           weight:
 *                             type: integer
 *                           isWinning:
 *                             type: boolean
 *                     _count:
 *                       type: object
 *                       properties:
 *                         plays:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wheel not found
 */
/**
 * Get a specific wheel with its slots
 */
export const getWheel = async (req: Request, res: Response) => {
  try {
    const { companyId, wheelId } = req.params;

    // Validate IDs
    if (!companyId || !wheelId) {
      return res.status(400).json({ error: 'Invalid or missing IDs in URL.' });
    }

    // Special handling for demo-company-id (SUPER admin with no companies)
    if (companyId === 'demo-company-id' && req.user?.role === 'SUPER') {
      return res.status(404).json({ error: 'Wheel not found in demo company' });
    }

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
 * @openapi
 * /companies/{companyId}/wheels:
 *   post:
 *     summary: Create a new wheel
 *     tags:
 *       - Wheels
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the company
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - mode
 *               - formSchema
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               mode:
 *                 type: string
 *                 enum: [LEAD_GENERATION, INSTANT_WIN]
 *               formSchema:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Wheel created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 wheel:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     mode:
 *                       type: string
 *                     formSchema:
 *                       type: object
 *                     isActive:
 *                       type: boolean
 *                     companyId:
 *                       type: string
 *       400:
 *         description: Invalid input or company has reached wheel limit
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Company not found
 */
/**
 * Create a new wheel
 */
export const createWheel = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    
    // Special handling for demo-company-id (SUPER admin with no companies)
    if (companyId === 'demo-company-id' && req.user?.role === 'SUPER') {
      return res.status(400).json({ 
        error: 'Cannot create wheels in demo mode. Please create a company first.' 
      });
    }
    
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
 * @openapi
 * /companies/{companyId}/wheels/{wheelId}:
 *   put:
 *     summary: Update an existing wheel
 *     tags:
 *       - Wheels
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               mode:
 *                 type: string
 *                 enum: [LEAD_GENERATION, INSTANT_WIN]
 *               formSchema:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Wheel updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 wheel:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     mode:
 *                       type: string
 *                     formSchema:
 *                       type: object
 *                     isActive:
 *                       type: boolean
 *                     companyId:
 *                       type: string
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wheel not found
 */
/**
 * Update an existing wheel
 */
export const updateWheel = async (req: Request, res: Response) => {
  try {
    const { companyId, wheelId } = req.params;
    
    // Special handling for demo-company-id (SUPER admin with no companies)
    if (companyId === 'demo-company-id' && req.user?.role === 'SUPER') {
      return res.status(404).json({ error: 'Wheel not found in demo company' });
    }
    
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
 * @openapi
 * /companies/{companyId}/wheels/{wheelId}:
 *   delete:
 *     summary: Delete a wheel
 *     tags:
 *       - Wheels
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
 *       204:
 *         description: Wheel deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wheel not found
 */
/**
 * Delete a wheel
 */
export const deleteWheel = async (req: Request, res: Response) => {
  try {
    const { companyId, wheelId } = req.params;
    
    // Special handling for demo-company-id (SUPER admin with no companies)
    if (companyId === 'demo-company-id' && req.user?.role === 'SUPER') {
      return res.status(404).json({ error: 'Wheel not found in demo company' });
    }
    
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