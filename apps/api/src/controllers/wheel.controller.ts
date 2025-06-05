import { Request, Response } from 'express';
import { WheelMode, SocialNetwork, PlayLimit, Plan } from '@prisma/client';
import prisma from '../utils/db';
import { z } from 'zod';
import { createError } from '../middlewares/error.middleware';
import { generateQRCode } from '../utils/qrcode';

// Validation schema for creating/updating a wheel
const wheelSchema = z.object({
  name: z.string().min(1).max(100),
  mode: z.nativeEnum(WheelMode),
  formSchema: z.record(z.any()).or(z.array(z.any())),
  isActive: z.boolean().optional().default(false),
  probability: z.number().optional(),
  // New fields for social media redirection
  socialNetwork: z.nativeEnum(SocialNetwork).optional(),
  redirectUrl: z.string().url().optional(),
  redirectText: z.string().max(500).optional(),
  // New field for play limit
  playLimit: z.nativeEnum(PlayLimit).optional().default(PlayLimit.ONCE_PER_DAY),
  // New fields for customization
  gameRules: z.string().max(2000).optional(),
  footerText: z.string().max(500).optional(),
  mainTitle: z.string().max(100).optional(),
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
        slots: {
          where: { isActive: true }
        },
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
    const { name, mode, formSchema, isActive, socialNetwork, redirectUrl, redirectText, playLimit } = req.body;

    // Validate companyId
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Find company
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: { wheels: true }
        }
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if company is on the free plan and has reached wheel limit
    if (company.plan === Plan.FREE && company._count.wheels >= company.maxWheels) {
      return res.status(403).json({
        error: 'Free plan limit reached',
        message: 'You have reached the maximum number of wheels allowed on the free plan. Please upgrade to create more wheels.',
        code: 'FREE_PLAN_WHEEL_LIMIT'
      });
    }

    // Check if company has reached their wheel limit (for any plan)
    if (company._count.wheels >= company.maxWheels) {
      return res.status(403).json({ 
        error: 'Maximum wheels limit reached',
        message: `Your company is limited to ${company.maxWheels} wheels. Please delete an existing wheel or contact support to increase your limit.`,
        code: 'MAX_WHEELS_LIMIT'
      });
    }

    // Create wheel
    const wheel = await prisma.wheel.create({
      data: {
        name,
        mode: mode || WheelMode.RANDOM_WIN,
        formSchema: formSchema || {},
        isActive: isActive !== undefined ? isActive : false,
        company: {
          connect: { id: companyId }
        },
        // Add new fields if provided
        socialNetwork,
        redirectUrl,
        redirectText,
        playLimit: playLimit || PlayLimit.ONCE_PER_DAY,
      },
    });

    // Generate QR code for the wheel
    const baseUrl = process.env.FRONTEND_URL || 'https://roue.izikado.fr';
    const wheelUrl = `${baseUrl}/play/company/${wheel.id}`;
    
    try {
      const qrCodeLink = await generateQRCode(wheelUrl);
      
      // Update wheel with QR code link
      await prisma.wheel.update({
        where: { id: wheel.id },
        data: { qrCodeLink }
      });
      
      // Include QR code in the response
      wheel.qrCodeLink = qrCodeLink;
    } catch (qrError) {
      console.error('Failed to generate QR code:', qrError);
      // Continue without QR code - it's not critical
    }

    res.status(201).json({ wheel });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.format() });
    }
    console.error('Create wheel error:', error);
    res.status(500).json({ error: 'Failed to create wheel' });
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
 * Update a wheel
 */
export const updateWheel = async (req: Request, res: Response) => {
  try {
    const { companyId, wheelId } = req.params;

    // Validate IDs
    if (!companyId || !wheelId) {
      return res.status(400).json({ error: 'Invalid or missing IDs in URL.' });
    }

    // Log the raw request body for debugging
    console.log('Raw wheel update request body:', JSON.stringify(req.body, null, 2));

    // Validate wheel data
    const validationResult = wheelSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error('Wheel update validation failed:', validationResult.error);
      return res.status(400).json({ 
        error: 'Invalid wheel data', 
        details: validationResult.error.format() 
      });
    }
    
    // Log the validated data to help with debugging
    const validatedData = validationResult.data;
    console.log('Updating wheel with validated data:', JSON.stringify(validatedData, null, 2));
    console.log('Wheel mode:', validatedData.mode);
    
    // Remove probability field if it exists (not in schema)
    const { probability, ...wheelDataForDb } = validatedData;

    // Check if wheel exists and belongs to the company
    const existingWheel = await prisma.wheel.findFirst({
      where: {
        id: wheelId,
        companyId,
      },
    });

    if (!existingWheel) {
      return res.status(404).json({ error: 'Wheel not found or does not belong to this company.' });
    }

    // Update the wheel
    const wheel = await prisma.wheel.update({
      where: { id: wheelId },
      data: wheelDataForDb,
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

/**
 * Fix a wheel's slots by setting positions and making at least one slot winning
 */
export const fixWheel = async (req: Request, res: Response) => {
  try {
    const { wheelId } = req.params;

    // Get the wheel with its slots
    const wheel = await prisma.wheel.findUnique({
      where: { id: wheelId },
      include: { slots: true },
    });

    if (!wheel) {
      return res.status(404).json({ error: 'Wheel not found' });
    }

    console.log(`Fixing wheel: ${wheel.name} (${wheelId})`);

    let slotsCreated = 0;
    let slotsUpdated = 0;

    // If wheel has no slots, create default ones
    if (wheel.slots.length === 0) {
      console.log('No slots found, creating default slots');
      
      // Create default slots
      const defaultSlots = [
        { 
          wheelId,
          label: 'Prix 1', 
          prizeCode: 'PRIZE1',
          color: '#FF6384',
          weight: 34,
          isWinning: true,
          position: 0,
          isActive: true
        },
        { 
          wheelId,
          label: 'Prix 2', 
          prizeCode: 'PRIZE2',
          color: '#36A2EB',
          weight: 33,
          isWinning: false,
          position: 1,
          isActive: true
        },
        { 
          wheelId,
          label: 'Prix 3', 
          prizeCode: 'PRIZE3',
          color: '#FFCE56',
          weight: 33,
          isWinning: false,
          position: 2,
          isActive: true
        }
      ];
      
      for (const slotData of defaultSlots) {
        await prisma.slot.create({
          data: slotData
        });
        slotsCreated++;
      }
    } else {
      console.log(`Found ${wheel.slots.length} slots to fix`);
      
      // Ensure slots have proper positions and at least one is winning
      let hasWinningSlot = wheel.slots.some(slot => slot.isWinning);
      
      for (let i = 0; i < wheel.slots.length; i++) {
        const slot = wheel.slots[i];
        const updates: any = {
          position: i,
          isActive: true
        };
        
        // Make first slot winning if none are winning
        if (!hasWinningSlot && i === 0) {
          updates.isWinning = true;
          hasWinningSlot = true;
        }
        
        await prisma.slot.update({
          where: { id: slot.id },
          data: updates
        });
        
        slotsUpdated++;
      }
    }

    return res.status(200).json({
      message: 'Wheel fixed successfully',
      wheelId,
      slotsCreated,
      slotsUpdated
    });
  } catch (error) {
    console.error('Error fixing wheel:', error);
    return res.status(500).json({ error: 'Failed to fix wheel' });
  }
}; 