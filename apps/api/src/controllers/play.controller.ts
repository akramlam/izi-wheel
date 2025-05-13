import { Request, Response } from 'express';
import prisma from '../utils/db';
import { z } from 'zod';
import { createError } from '../middlewares/error.middleware';
import { checkRateLimit, getRateLimitKey, getRateLimitTTL } from '../utils/redis';
import { PlayResult, WheelMode, Plan } from '@prisma/client';
import crypto from 'crypto';
import { createObjectCsvStringifier } from 'csv-writer';
import { subDays } from 'date-fns';

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
 * Generate a random slot based on probabilities
 */
const selectRandomSlot = (slots: Array<{ id: string; probability: number }>) => {
  // Validate slots
  if (!slots || slots.length === 0) {
    throw new Error('No slots available');
  }
  
  // Calculate total probability
  const totalProbability = slots.reduce((sum, slot) => sum + slot.probability, 0);
  if (totalProbability !== 100) {
    throw new Error('Total probability must equal 100%');
  }
  
  // Generate a random number between 1 and 100
  const randomNum = Math.floor(Math.random() * 100) + 1;
  
  // Select slot based on probability ranges
  let cumulativeProbability = 0;
  for (const slot of slots) {
    cumulativeProbability += slot.probability;
    if (randomNum <= cumulativeProbability) {
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
 * Generate a QR code link for prize redemption
 */
const generateQrLink = (playId: string, pin: string): string => {
  // In a real implementation, this would generate a link to a QR code service
  // For now, we'll just create a URL with the playId and pin
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${baseUrl}/redeem/${playId}/${pin}`;
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
    const { lead } = validatedData;
    
    // Find the wheel and its slots
    const wheel = await prisma.wheel.findUnique({
      where: { id: wheelId },
      include: {
        slots: {
          select: {
            id: true,
            probability: true,
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
      // In ALL_WIN mode, everyone wins
      result = PlayResult.WIN;
      selectedSlotId = selectRandomSlot(wheel.slots);
    } else {
      // In RANDOM_WIN mode, not everyone wins
      // We could implement custom win rates here, but for now 50/50
      const isWinner = Math.random() < 0.5;
      result = isWinner ? PlayResult.WIN : PlayResult.LOSE;
      
      if (isWinner) {
        selectedSlotId = selectRandomSlot(wheel.slots);
      } else {
        // For losers, still select a slot for display purposes
        selectedSlotId = selectRandomSlot(wheel.slots);
      }
    }
    
    // Create the play record in a transaction
    const play = await prisma.$transaction(async (tx) => {
      // Create the play
      const newPlay = await tx.play.create({
        data: {
          wheelId,
          ip,
          result,
          lead: lead || undefined
        },
      });
      
      // If the player won, create a prize
      if (result === PlayResult.WIN) {
        const selectedSlot = wheel.slots.find(slot => slot.id === selectedSlotId);
        
        if (!selectedSlot) {
          throw new Error('Selected slot not found');
        }
        
        const pin = generatePin();
        const qrLink = generateQrLink(newPlay.id, pin);
        
        // Create the prize
        await tx.prize.create({
          data: {
            playId: newPlay.id,
            pin,
            qrLink,
          },
        });
      }
      
      return tx.play.findUnique({
        where: { id: newPlay.id },
        include: {
          prize: true,
        },
      });
    });
    
    if (!play) {
      throw createError('Failed to create play record', 500);
    }
    
    // Find the selected slot for the response
    const selectedSlot = wheel.slots.find(slot => slot.id === selectedSlotId);
    
    // Return the play result
    res.status(200).json({
      play,
      slot: selectedSlot,
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
    const { playId } = req.params;
    const { pin } = req.body;
    
    if (!pin) {
      throw createError('PIN is required', 400);
    }
    
    // Find the prize
    const prize = await prisma.prize.findUnique({
      where: { playId },
    });
    
    if (!prize) {
      throw createError('Prize not found', 404);
    }
    
    if (prize.redeemedAt) {
      throw createError('Prize already redeemed', 400);
    }
    
    // Verify PIN
    if (prize.pin !== pin) {
      throw createError('Invalid PIN', 400);
    }
    
    // Mark prize as redeemed
    const updatedPrize = await prisma.prize.update({
      where: { id: prize.id },
      data: {
        redeemedAt: new Date(),
      },
    });
    
    res.status(200).json({ prize: updatedPrize });
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
    const { page = '1', limit = '20' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    // Verify wheel exists
    const wheel = await prisma.wheel.findUnique({
      where: { id: wheelId },
    });
    
    if (!wheel) {
      throw createError('Wheel not found', 404);
    }
    
    // Get play count
    const totalPlays = await prisma.play.count({
      where: { wheelId },
    });
    
    // Get paginated plays
    const plays = await prisma.play.findMany({
      where: { wheelId },
      include: {
        prize: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });
    
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

/**
 * @openapi
 * /companies/{companyId}/wheels/{wheelId}/leads:
 *   get:
 *     summary: Get all leads for a wheel (JSON format)
 *     tags:
 *       - Leads
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
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter leads from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter leads to this date (YYYY-MM-DD)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of leads for the wheel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 leads:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       lead:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           birthDate:
 *                             type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Premium feature
 *       404:
 *         description: Wheel not found
 */
export const getWheelLeads = async (req: Request, res: Response) => {
  try {
    // Accept both wheelId and wid for compatibility
    const wheelId = req.params.wheelId || req.params.wid;
    const { from, to } = req.query;
    // Check if user's company has PREMIUM plan
    const wheel = await prisma.wheel.findUnique({
      where: { id: wheelId },
      include: {
        company: {
          select: {
            plan: true
          }
        }
      }
    });
    if (!wheel) {
      return res.status(404).json({ error: 'Wheel not found' });
    }
    if (wheel.company.plan !== Plan.PREMIUM) {
      return res.status(402).json({ error: 'This feature requires a PREMIUM plan' });
    }
    const dateFilter = {};
    if (from || to) {
      dateFilter['createdAt'] = {};
      if (from) dateFilter['createdAt']['gte'] = new Date(from as string);
      if (to) dateFilter['createdAt']['lte'] = new Date(to as string);
    }
    const plays = await prisma.play.findMany({
      where: {
        wheelId,
        lead: { not: null },
        ...dateFilter
      },
      select: {
        id: true,
        createdAt: true,
        lead: true,
        result: true,
        prize: { select: { redeemedAt: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ leads: plays });
  } catch (error) {
    console.error('Get wheel leads error:', error);
    res.status(500).json({ error: 'Failed to fetch wheel leads' });
  }
};

/**
 * @openapi
 * /companies/{companyId}/wheels/{wheelId}/leads.csv:
 *   get:
 *     summary: Get all leads for a wheel (CSV format)
 *     tags:
 *       - Leads
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
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter leads from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter leads to this date (YYYY-MM-DD)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file with leads data
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Premium feature
 *       404:
 *         description: Wheel not found
 */
export const getWheelLeadsCsv = async (req: Request, res: Response) => {
  try {
    const wheelId = req.params.wheelId || req.params.wid;
    const { from, to } = req.query;
    const wheel = await prisma.wheel.findUnique({
      where: { id: wheelId },
      include: {
        company: { select: { plan: true, name: true } }
      }
    });
    if (!wheel) {
      return res.status(404).json({ error: 'Wheel not found' });
    }
    if (wheel.company.plan !== Plan.PREMIUM) {
      return res.status(402).json({ error: 'This feature requires a PREMIUM plan' });
    }
    const dateFilter = {};
    if (from || to) {
      dateFilter['createdAt'] = {};
      if (from) dateFilter['createdAt']['gte'] = new Date(from as string);
      if (to) dateFilter['createdAt']['lte'] = new Date(to as string);
    }
    const plays = await prisma.play.findMany({
      where: {
        wheelId,
        lead: { not: null },
        ...dateFilter
      },
      select: {
        id: true,
        createdAt: true,
        lead: true,
        result: true,
        prize: { select: { redeemedAt: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    const records = plays.map(play => {
      const lead = play.lead as any;
      return {
        id: play.id,
        date: play.createdAt.toISOString(),
        name: lead?.name || '',
        email: lead?.email || '',
        phone: lead?.phone || '',
        birthDate: lead?.birthDate || '',
        result: play.result,
        redeemed: play.prize?.redeemedAt ? 'Yes' : 'No'
      };
    });
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'id', title: 'ID' },
        { id: 'date', title: 'Date' },
        { id: 'name', title: 'Name' },
        { id: 'email', title: 'Email' },
        { id: 'phone', title: 'Phone' },
        { id: 'birthDate', title: 'Birth Date' },
        { id: 'result', title: 'Result' },
        { id: 'redeemed', title: 'Prize Redeemed' }
      ]
    });
    const csvString = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
    
    // Force the exact Content-Type header without charset
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="leads-${wheel.company.name}-${new Date().toISOString().split('T')[0]}.csv"`
    });
    res.send(csvString);
  } catch (error) {
    console.error('Get wheel leads CSV error:', error);
    res.status(500).json({ error: 'Failed to generate leads CSV' });
  }
};

/**
 * @openapi
 * /companies/{companyId}/statistics:
 *   get:
 *     summary: Get company statistics
 *     tags:
 *       - Companies
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: UUID of the company
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year, all]
 *         default: month
 *         description: Time period for statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPlays:
 *                   type: integer
 *                 totalLeads:
 *                   type: integer
 *                 totalPrizes:
 *                   type: integer
 *                 redemptionRate:
 *                   type: number
 *                   format: float
 *                 wheelStats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       plays:
 *                         type: integer
 *                       leads:
 *                         type: integer
 *                       prizes:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an admin or super user
 *       404:
 *         description: Company not found
 */
export const getCompanyStatistics = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { from, to } = req.query;
    
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

    // Plays by day with date filter
    const playsByDay = await prisma.play.groupBy({
      by: ['createdAt'],
      where: {
        wheel: { companyId },
        createdAt: { 
          gte: fromDate,
          lte: toDate
        }
      },
      _count: {
        id: true
      }
    });

    // Format the grouped data
    const formattedPlaysByDay = playsByDay.map(day => ({
      date: day.createdAt.toISOString().split('T')[0],
      count: day._count.id
    }));

    // Prizes by day with date filter
    const prizesByDay = await prisma.prize.groupBy({
      by: ['createdAt'],
      where: {
        play: { 
          wheel: { companyId },
          createdAt: { 
            gte: fromDate,
            lte: toDate
          }
        }
      },
      _count: {
        id: true
      }
    });

    // Format the grouped data
    const formattedPrizesByDay = prizesByDay.map(day => ({
      date: day.createdAt.toISOString().split('T')[0],
      count: day._count.id
    }));

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
      playsByDay: formattedPlaysByDay,
      prizesByDay: formattedPrizesByDay,
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