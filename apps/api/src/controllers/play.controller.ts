import { Request, Response } from 'express';
import prisma from '../utils/db';
import { z } from 'zod';
import { createError } from '../middlewares/error.middleware';
import { checkRateLimit, getRateLimitKey, getRateLimitTTL } from '../utils/redis';
import { PlayResult, WheelMode, Plan } from '@prisma/client';
import crypto from 'crypto';
import { createObjectCsvStringifier } from 'csv-writer';
import { subDays } from 'date-fns';
import { generateQRCode } from '../utils/qrcode';
import { generatePIN } from '../utils/pin';

// Validation schema for play request
const playSchema = z.object({
  playerInfo: z.record(z.any()).optional(),
  lead: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    birthDate: z.string().optional()
  }).optional()
});

/**
 * Generate a random slot based on weights
 */
const selectRandomSlot = (slots: Array<{ id: string; weight: number }>) => {
  // Validate slots
  if (!slots || slots.length === 0) {
    throw new Error('No slots available');
  }
  
  // Calculate total weight
  const totalWeight = slots.reduce((sum, slot) => sum + slot.weight, 0);
  if (totalWeight !== 100) {
    throw new Error('Total weight must equal 100%');
  }
  
  // Generate a random number between 1 and 100
  const randomNum = Math.floor(Math.random() * 100) + 1;
  
  // Select slot based on weight ranges
  let cumulativeWeight = 0;
  for (const slot of slots) {
    cumulativeWeight += slot.weight;
    if (randomNum <= cumulativeWeight) {
      return slot.id;
    }
  }
  
  // Fallback (should never happen)
  return slots[0].id;
};

/**
 * Generate a unique PIN for prize redemption
 */
const generatePin = (): string => {
  // Generate a 6-digit numeric PIN
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * @openapi
 * /plays/{wheelId}/spin:
 *   post:
 *     summary: Spin the wheel and create a play record
 *     tags:
 *       - Plays
 *     parameters:
 *       - in: path
 *         name: wheelId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the wheel
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               playerInfo:
 *                 type: object
 *                 description: Custom player information
 *               lead:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                     format: email
 *                   phone:
 *                     type: string
 *                   birthDate:
 *                     type: string
 *                     format: date
 *     responses:
 *       200:
 *         description: Successfully spun the wheel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 play:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     wheelId:
 *                       type: string
 *                     ip:
 *                       type: string
 *                     result:
 *                       type: string
 *                       enum: [WIN, LOSE]
 *                     lead:
 *                       type: object
 *                     prize:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                         playId:
 *                           type: string
 *                         pin:
 *                           type: string
 *                         qrLink:
 *                           type: string
 *                         redeemedAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
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
 *       400:
 *         description: Invalid input or wheel is not active
 *       404:
 *         description: Wheel not found
 *       429:
 *         description: Rate limit exceeded
 */
/**
 * Spin the wheel and create a play record
 */
export const spinWheel = async (req: Request, res: Response) => {
  try {
    const { wheelId } = req.params;
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    
    // Validate request body
    const validatedData = playSchema.parse(req.body);
    
    // Find the wheel and its slots
    const wheel = await prisma.wheel.findUnique({
      where: { id: wheelId },
      include: {
        slots: {
          select: {
            id: true,
            weight: true,
            prizeCode: true,
            label: true,
          },
        },
      },
    });
    
    if (!wheel) {
      throw createError('Wheel not found', 404);
    }
    
    if (!wheel.isActive) {
      throw createError('Wheel is not active', 400);
    }
    
    if (!wheel.slots || wheel.slots.length === 0) {
      throw createError('Wheel has no slots', 400);
    }
    
    // Check rate limits
    const dailyKey = getRateLimitKey(wheelId, ip, 'daily');
    const weeklyKey = getRateLimitKey(wheelId, ip, 'weekly');
    const monthlyKey = getRateLimitKey(wheelId, ip, 'monthly');
    
    const [dailyLimited, weeklyLimited, monthlyLimited] = await Promise.all([
      checkRateLimit(dailyKey, getRateLimitTTL('daily')),
      checkRateLimit(weeklyKey, getRateLimitTTL('weekly')),
      checkRateLimit(monthlyKey, getRateLimitTTL('monthly')),
    ]);
    
    if (dailyLimited || weeklyLimited || monthlyLimited) {
      throw createError('Rate limit exceeded', 429);
    }
    
    // Determine if the player wins based on wheel mode
    let result: PlayResult;
    let selectedSlotId: string;
    
    if (wheel.mode === WheelMode.ALL_WIN) {
      result = PlayResult.WIN;
      selectedSlotId = selectRandomSlot(wheel.slots);
    } else {
        selectedSlotId = selectRandomSlot(wheel.slots);
      result = PlayResult.WIN;
    }
    
    // Generate PIN and QR Link for the prize if it's a WIN
    let pin: string | undefined;
    let qrLink: string | undefined;

    if (result === PlayResult.WIN) {
      pin = generatePin();
    }
    
    // Create the play record
    const play = await prisma.play.create({
        data: {
          wheelId,
        companyId: wheel.companyId,
        slotId: selectedSlotId,
        result,
          ip,
        leadInfo: validatedData.lead || undefined,
        pin: pin,
        redemptionStatus: result === PlayResult.WIN ? 'PENDING' : undefined,
        },
      });
      
    // If it was a win and we now have a play.id, generate the actual QR link
    if (result === PlayResult.WIN && play.pin) {
      try {
        const baseUrl = process.env.FRONTEND_URL || 'https://roue.izikado.fr';
        const redemptionUrl = `${baseUrl}/redeem/${play.id}`;
        qrLink = await generateQRCode(redemptionUrl);
        await prisma.play.update({
          where: { id: play.id },
          data: { qrLink: qrLink },
        });
        console.log(`Generated QR code for play ${play.id}`);
      } catch (qrError) {
        console.error('Failed to generate QR code:', qrError);
        // Continue without QR code - the PIN will still work
        qrLink = undefined;
      }
    }
    
    // Increment rate limits (or rather, ensure they are set for the current period)
    // The initial checkRateLimit calls before creating the play record would have already
    // set these keys if they weren't present. These calls ensure they are set if the
    // very first play in a period happens now.
    await Promise.all([
      checkRateLimit(dailyKey, getRateLimitTTL('daily')),
      checkRateLimit(weeklyKey, getRateLimitTTL('weekly')),
      checkRateLimit(monthlyKey, getRateLimitTTL('monthly')),
    ]);
    
    // Get the selected slot details to return
    const selectedSlotDetails = wheel.slots.find(s => s.id === selectedSlotId);

    res.status(200).json({
      play: {
        ...play,
        qrLink: qrLink,
      },
      slot: selectedSlotDetails,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(error instanceof z.ZodError ? 400 : error.message.includes('Rate limit') ? 429 : 500).json({ 
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
 * /plays/{playId}/redeem:
 *   post:
 *     summary: Redeem a prize
 *     tags:
 *       - Plays
 *     parameters:
 *       - in: path
 *         name: playId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the play
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pin
 *             properties:
 *               pin:
 *                 type: string
 *                 description: The 6-digit PIN for prize redemption
 *     responses:
 *       200:
 *         description: Prize redeemed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 prize:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     playId:
 *                       type: string
 *                     pin:
 *                       type: string
 *                     qrLink:
 *                       type: string
 *                     redeemedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid PIN, missing PIN, or prize already redeemed
 *       404:
 *         description: Prize not found
 */
/**
 * Redeem a prize
 */
export const redeemPrize = async (req: Request, res: Response) => {
  try {
    const { playId, pin } = req.body;
    
    if (!playId || !pin) {
      throw createError('Play ID and PIN are required', 400);
    }
    
    // Find the play record
    const play = await prisma.play.findUnique({
      where: { id: playId },
    });
    
    if (!play) {
      throw createError('Play record not found', 404);
    }
    
    if (play.redemptionStatus === 'REDEEMED') {
      throw createError('Prize already redeemed', 400);
    }
    
    if (play.pin !== pin) {
      throw createError('Invalid PIN', 401);
    }
    
    // Update redemption status
    const updatedPlay = await prisma.play.update({
      where: { id: playId },
      data: {
        redemptionStatus: 'REDEEMED',
        redeemedAt: new Date(),
      },
    });
    
    res.status(200).json({
      message: 'Prize redeemed successfully',
      play: updatedPlay,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(error.message.includes('not found') ? 404 : 400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
};

/**
 * Get play history for a wheel
 */
export const getPlayHistory = async (req: Request, res: Response) => {
  try {
    const { wheelId } = req.params;
    const { page = 1, limit = 10, status, search } = req.query;
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    
    const whereClause: any = { wheelId };
    if (status) {
      whereClause.redemptionStatus = status as string;
    }
    if (search) {
      whereClause.OR = [
        { leadInfo: { path: ['name'], string_contains: search as string, mode: 'insensitive' } },
        { leadInfo: { path: ['email'], string_contains: search as string, mode: 'insensitive' } },
        { pin: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    const plays = await prisma.play.findMany({
      where: whereClause,
      include: {
        slot: {
          select: { label: true, prizeCode: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });
    
    const totalPlays = await prisma.play.count({ where: whereClause });
    
    res.status(200).json({
      plays,
      pagination: {
        total: totalPlays,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalPlays / limitNum),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
};

// Commenting out functions that need major rework due to schema mismatch
/*
export const getCompanyStatistics = async (req: Request, res: Response) => {
  // ... (original content relying on prisma.prize and distinct lead fields)
};

export const getWheelLeads = async (req: Request, res: Response) => {
  // ... (original content relying on distinct lead fields)
};

export const getWheelLeadsCsv = async (req: Request, res: Response) => {
  // ... (original content relying on distinct lead fields and play.prize)
};
*/

// Make sure to export all functions that are kept or modified
export { selectRandomSlot }; // If it's used by other modules, otherwise it can be local
// Ensure other existing exports are maintained if they are not touched or are fixed separately 