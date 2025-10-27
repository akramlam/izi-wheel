import { Request, Response } from 'express';
import prisma from '../utils/db';
import { prizeSelector } from '../services/prize/prizeSelector';
import { pinGenerator } from '../services/prize/pinGenerator';
import { qrCodeGenerator } from '../services/prize/qrCodeGenerator';
import { playLimiter } from '../services/rateLimit/playLimiter';
import { sortSlots, findPrizeIndex } from '../utils/slotSorter';
import { sendPrizeEmail } from '../utils/mailer';

/**
 * Get real client IP from request
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

/**
 * GET /api/public/wheels/:wheelId
 * Get public wheel data (no authentication required)
 */
export const getPublicWheel = async (req: Request, res: Response) => {
  try {
    const { wheelId } = req.params;

    if (!wheelId) {
      return res.status(400).json({ error: 'Wheel ID is required' });
    }

    console.log(`📡 Fetching public wheel: ${wheelId}`);

    // Find wheel with active slots
    const wheel = await prisma.wheel.findUnique({
      where: {
        id: wheelId,
        isActive: true
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            isActive: true,
            contactText: true,
            rulesText: true
          }
        },
        slots: {
          where: { isActive: true },
          select: {
            id: true,
            label: true,
            color: true,
            position: true,
            description: true
            // NOTE: weight and isWinning are NOT exposed for security
          }
        }
      }
    });

    if (!wheel) {
      return res.status(404).json({ error: 'Wheel not found or inactive' });
    }

    if (!wheel.company || !wheel.company.isActive) {
      return res.status(403).json({ error: 'Company is not active' });
    }

    // Sort slots consistently
    const sortedSlots = sortSlots(wheel.slots);

    return res.status(200).json({
      wheel: {
        id: wheel.id,
        name: wheel.name,
        mode: wheel.mode,
        playLimit: wheel.playLimit,
        mainTitle: wheel.mainTitle,
        gameRules: wheel.gameRules,
        footerText: wheel.footerText,
        bannerImage: wheel.bannerImage,
        backgroundImage: wheel.backgroundImage,
        formSchema: wheel.formSchema,
        socialNetwork: wheel.socialNetwork,
        redirectUrl: wheel.redirectUrl,
        redirectText: wheel.redirectText,
        contactText: wheel.company.contactText,
        rulesText: wheel.company.rulesText
      },
      slots: sortedSlots
    });
  } catch (error) {
    console.error('Error fetching public wheel:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/public/wheels/:wheelId/spin
 * Spin the wheel and record play result
 */
export const spinWheel = async (req: Request, res: Response) => {
  try {
    const { wheelId } = req.params;
    const { leadInfo } = req.body;

    if (!wheelId) {
      return res.status(400).json({ error: 'Wheel ID is required' });
    }

    const clientIP = getClientIP(req);
    console.log(`🎰 Spin request for wheel ${wheelId} from IP: ${clientIP}`);

    // Find wheel with slots
    const wheel = await prisma.wheel.findUnique({
      where: {
        id: wheelId,
        isActive: true
      },
      include: {
        company: {
          select: {
            id: true,
            isActive: true
          }
        },
        slots: {
          where: { isActive: true }
        }
      }
    });

    if (!wheel) {
      return res.status(404).json({ error: 'Wheel not found or inactive' });
    }

    if (!wheel.company || !wheel.company.isActive) {
      return res.status(403).json({ error: 'Company is not active' });
    }

    if (!wheel.slots || wheel.slots.length === 0) {
      return res.status(400).json({ error: 'Wheel has no active slots' });
    }

    // Check rate limits
    const canPlay = await playLimiter.canPlay(wheelId, clientIP, wheel.playLimit);
    if (!canPlay) {
      const timeUntilNext = await playLimiter.getTimeUntilNextPlay(wheelId, clientIP, wheel.playLimit);
      return res.status(429).json({
        error: 'Play limit exceeded',
        playLimit: wheel.playLimit,
        timeUntilNextPlay: timeUntilNext
      });
    }

    // Sort slots for consistent ordering
    const sortedSlots = sortSlots(wheel.slots);

    console.log('🎯 Backend sorted slots order:', sortedSlots.map((slot, index) => `[#${index}] pos=${slot.position} label="${slot.label}" id=${slot.id}`));

    // Select prize based on wheel mode
    let selectedSlot;
    let prizeIndex;

    try {
      if (wheel.mode === 'ALL_WIN') {
        const result = prizeSelector.selectWinningPrize(sortedSlots);
        selectedSlot = result.slot;
        prizeIndex = findPrizeIndex(sortedSlots, selectedSlot.id);
      } else {
        const result = prizeSelector.selectPrize(sortedSlots);
        selectedSlot = result.slot;
        prizeIndex = result.index;
      }
    } catch (prizeError) {
      console.error('Prize selection error:', prizeError);

      // If weight validation fails, fall back to random selection
      console.warn('⚠️ Weight validation failed, using fallback random selection');

      if (wheel.mode === 'ALL_WIN') {
        // For ALL_WIN mode, only select from winning slots
        const winningSlots = sortedSlots.filter(s => s.isWinning);
        if (winningSlots.length === 0) {
          // If no slots marked as winning, treat all slots as winning
          console.warn('⚠️ No winning slots found in ALL_WIN mode, treating all as winning');
          const randomIndex = Math.floor(Math.random() * sortedSlots.length);
          selectedSlot = sortedSlots[randomIndex];
          prizeIndex = randomIndex;
        } else {
          const randomWinningSlot = winningSlots[Math.floor(Math.random() * winningSlots.length)];
          selectedSlot = randomWinningSlot;
          prizeIndex = sortedSlots.findIndex(s => s.id === randomWinningSlot.id);
        }
      } else {
        // For RANDOM_WIN mode, select from any slot
        const randomIndex = Math.floor(Math.random() * sortedSlots.length);
        selectedSlot = sortedSlots[randomIndex];
        prizeIndex = randomIndex;
      }
    }

    // In ALL_WIN mode, every slot is a winning slot
    const isWin = wheel.mode === 'ALL_WIN' ? true : selectedSlot.isWinning;

    // Generate PIN and QR code for winning plays
    let pin: string | null = null;
    let qrCodeData: string | null = null;

    if (isWin) {
      pin = await pinGenerator.generateUnique();
    }

    // Create play record in transaction
    const play = await prisma.play.create({
      data: {
        wheelId: wheel.id,
        companyId: wheel.company.id,
        slotId: selectedSlot.id,
        result: isWin ? 'WIN' : 'LOSE',
        pin,
        qrLink: null, // Will be updated below
        ip: clientIP,
        leadInfo: leadInfo || null,
        redemptionStatus: isWin ? 'PENDING' : undefined
      }
    });

    // Generate QR code with playId
    if (isWin && pin) {
      try {
        qrCodeData = await qrCodeGenerator.generate(play.id);

        // Update play with QR code
        await prisma.play.update({
          where: { id: play.id },
          data: { qrLink: qrCodeData }
        });
      } catch (qrError) {
        console.error('Failed to generate QR code:', qrError);
        // Continue without QR code - PIN still works
      }
    }

    console.log('🎯 Backend prize alignment data:', {
      prizeIndex,
      selectedSlotId: selectedSlot.id,
      selectedSlotLabel: selectedSlot.label,
      segmentCount: sortedSlots.length
    });

    console.log(`✅ Play created: ${play.id}, result: ${play.result}, prizeIndex: ${prizeIndex}`);

    return res.status(200).json({
      play: {
        id: play.id,
        result: play.result,
        prize: isWin ? {
          pin,
          qrCodeData
        } : null
      },
      slot: {
        id: selectedSlot.id,
        label: selectedSlot.label
      },
      prizeIndex // CRITICAL: Frontend uses this for wheel alignment
    });
  } catch (error) {
    console.error('Error spinning wheel:', error);

    if (error instanceof Error && error.message.includes('weights must sum')) {
      return res.status(500).json({ error: 'Wheel configuration error: Invalid slot weights' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/public/plays/:playId/claim
 * Claim a prize by submitting lead information
 */
export const claimPrize = async (req: Request, res: Response) => {
  try {
    const { playId } = req.params;
    const { name, email, phone, birthDate } = req.body;

    if (!playId) {
      return res.status(400).json({ error: 'Play ID is required' });
    }

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    console.log(`🎁 Claim request for play ${playId}`);

    // Find play
    const play = await prisma.play.findUnique({
      where: { id: playId },
      include: {
        slot: true
      }
    });

    if (!play) {
      return res.status(404).json({ error: 'Play not found' });
    }

    if (play.result !== 'WIN') {
      return res.status(400).json({ error: 'This play did not result in a prize' });
    }

    if (play.claimedAt) {
      return res.status(400).json({ error: 'Prize already claimed' });
    }

    // Update play with lead info
    const leadData = {
      name,
      email,
      phone: phone || undefined,
      birthDate: birthDate || undefined
    };

    const updatedPlay = await prisma.play.update({
      where: { id: playId },
      data: {
        leadInfo: leadData,
        claimedAt: new Date()
      }
    });

    console.log(`✅ Prize claimed by ${email}`);

    // Send email with PIN
    try {
      await sendPrizeEmail(
        email,
        play.slot.label,
        play.pin!,
        name, // Pass the user's name
        playId,
        play.companyId
      );
    } catch (emailError) {
      console.error('Failed to send prize email:', emailError);
      // Don't fail the claim if email fails
    }

    return res.status(200).json({
      success: true,
      message: 'Prize claimed successfully! Check your email for the PIN.',
      claimedAt: updatedPlay.claimedAt
    });
  } catch (error) {
    console.error('Error claiming prize:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/public/plays/:playId/redeem
 * Redeem a prize (merchant validates PIN)
 */
export const redeemPrize = async (req: Request, res: Response) => {
  try {
    const { playId } = req.params;
    const { pin } = req.body;

    if (!playId) {
      return res.status(400).json({ error: 'Play ID is required' });
    }

    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    if (!pinGenerator.validate(pin)) {
      return res.status(400).json({ error: 'Invalid PIN format' });
    }

    console.log(`🔓 Redeem request for play ${playId}`);

    // Find play
    const play = await prisma.play.findUnique({
      where: { id: playId },
      include: {
        slot: true
      }
    });

    if (!play) {
      return res.status(404).json({ error: 'Play not found' });
    }

    if (play.result !== 'WIN') {
      return res.status(400).json({ error: 'This play did not result in a prize' });
    }

    if (play.redemptionStatus === 'REDEEMED') {
      return res.status(400).json({
        error: 'Prize already redeemed',
        redeemedAt: play.redeemedAt
      });
    }

    if (!play.pin) {
      return res.status(500).json({ error: 'PIN not generated for this play' });
    }

    // Verify PIN (constant-time comparison)
    const pinValid = pinGenerator.verify(pin, play.pin);

    if (!pinValid) {
      console.warn(`❌ Invalid PIN attempt for play ${playId}`);
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // Update redemption status
    const updatedPlay = await prisma.play.update({
      where: { id: playId },
      data: {
        redemptionStatus: 'REDEEMED',
        redeemedAt: new Date()
      }
    });

    console.log(`✅ Prize redeemed successfully`);

    return res.status(200).json({
      success: true,
      message: 'Prize redeemed successfully',
      prize: {
        label: play.slot.label,
        description: play.slot.description
      },
      customer: play.leadInfo,
      redeemedAt: updatedPlay.redeemedAt
    });
  } catch (error) {
    console.error('Error redeeming prize:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/public/plays/:playId
 * Get play details (for redemption page)
 */
export const getPlayDetails = async (req: Request, res: Response) => {
  try {
    const { playId } = req.params;

    if (!playId) {
      return res.status(400).json({ error: 'Play ID is required' });
    }

    const play = await prisma.play.findUnique({
      where: { id: playId },
      include: {
        slot: {
          select: {
            label: true,
            description: true
          }
        }
      }
    });

    if (!play) {
      return res.status(404).json({ error: 'Play not found' });
    }

    return res.status(200).json({
      id: play.id,
      wheelId: play.wheelId,
      result: play.result,
      prize: play.result === 'WIN' ? {
        label: play.slot.label,
        description: play.slot.description
      } : null,
      redemptionStatus: play.redemptionStatus,
      claimedAt: play.claimedAt,
      redeemedAt: play.redeemedAt,
      leadInfo: play.leadInfo
    });
  } catch (error) {
    console.error('Error fetching play details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/public/plays/search
 * Search plays by PIN or email (authenticated - for merchants/admins)
 * Query params: pin OR email, companyId (optional)
 */
export const searchPlays = async (req: Request, res: Response) => {
  try {
    const { pin, email, companyId } = req.query;

    // Require either PIN or email
    if (!pin && !email) {
      return res.status(400).json({ error: 'Either PIN or email is required for search' });
    }

    console.log(`🔍 Play search request - PIN: ${pin ? 'provided' : 'none'}, Email: ${email || 'none'}, CompanyId: ${companyId || 'none'}`);

    // Build search query
    const where: any = {
      result: 'WIN', // Only search winning plays
    };

    if (pin) {
      where.pin = pin as string;
    }

    if (email) {
      where.leadInfo = {
        path: ['email'],
        equals: email as string
      };
    }

    if (companyId) {
      where.companyId = companyId as string;
    }

    // Search plays
    const plays = await prisma.play.findMany({
      where,
      include: {
        slot: {
          select: {
            label: true,
            description: true
          }
        },
        wheel: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20 // Limit results
    });

    console.log(`✅ Found ${plays.length} plays`);

    // Format response
    const formattedPlays = plays.map(play => ({
      id: play.id,
      result: play.result,
      createdAt: play.createdAt,
      claimedAt: play.claimedAt,
      redeemedAt: play.redeemedAt,
      redemptionStatus: play.redemptionStatus,
      pin: play.pin,
      slot: {
        label: play.slot.label,
        description: play.slot.description
      },
      wheel: {
        name: play.wheel.name
      },
      leadInfo: play.leadInfo
    }));

    return res.status(200).json(formattedPlays);
  } catch (error) {
    console.error('Error searching plays:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
