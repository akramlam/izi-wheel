import { Request, Response } from 'express';
import prisma, { checkPlayExists } from '../utils/db';
import { generateQRCode } from '../utils/qrcode';
import { generatePIN } from '../utils/pin';
import { ensureWheelHasSlots } from '../utils/db-init';
import { sendPrizeEmail } from '../utils/mailer';
import { logPlayActivity } from '../utils/activity-logger';
import { getRealClientIP, logIPDebugInfo } from '../utils/ip';

/**
 * Get public wheel data
 */
export const getPublicWheel = async (req: Request, res: Response) => {
  try {
    const { companyId, wheelId } = req.params;

    // Validate wheel ID - this is always required
    if (!wheelId) {
      return res.status(400).json({ 
        error: 'Wheel ID is required' 
      });
    }

    console.log(`Looking for wheel ${wheelId}${companyId ? ` and company ${companyId}` : ' without company ID'}`);

    // Special case: If companyId is 'company', treat it as a direct wheel lookup
    if (companyId === 'company') {
      console.log(`Special case: companyId is 'company', using direct wheel lookup for ${wheelId}`);
      // Use the direct wheel lookup logic
      const wheel = await prisma.wheel.findUnique({
        where: {
          id: wheelId,
          isActive: true
        },
        include: {
          company: true,
          slots: {
            where: { isActive: true },
            orderBy: { position: 'asc' }
          }
        }
      });

      if (!wheel) {
        console.log(`Wheel not found: ${wheelId}`);
        return res.status(404).json({ error: 'Wheel not found' });
      }

      // Verify the wheel's company is active
      if (!wheel.company || !wheel.company.isActive) {
        return res.status(403).json({ error: 'Company is not active' });
      }

      // Return only necessary data for public view
      return res.status(200).json({
        wheel: {
          id: wheel.id,
          name: wheel.name,
          formSchema: wheel.formSchema,
          socialNetwork: wheel.socialNetwork,
          redirectUrl: wheel.redirectUrl,
          redirectText: wheel.redirectText,
          playLimit: wheel.playLimit,
          gameRules: wheel.gameRules,
          footerText: wheel.footerText,
          mainTitle: wheel.mainTitle,
          bannerImage: wheel.bannerImage,
          backgroundImage: wheel.backgroundImage,
          slots: applyStableSorting(wheel.slots).map(slot => ({
            id: slot.id,
            label: slot.label,
            color: slot.color,
            weight: slot.weight,
            isWinning: slot.isWinning,
            position: slot.position
          }))
        }
      });
    }

    // Check if we're using the fallback route (no companyId provided)
    if (!companyId || companyId === 'undefined' || companyId === 'null') {
      console.log(`No valid company ID provided, using direct wheel lookup`);
      
      // Find the wheel without requiring a specific company
      const wheel = await prisma.wheel.findUnique({
        where: {
          id: wheelId,
          isActive: true
        },
        include: {
          company: true,
          slots: {
            where: { isActive: true },
            orderBy: { position: 'asc' }
          }
        }
      });

      if (!wheel) {
        console.log(`Wheel not found: ${wheelId}`);
        return res.status(404).json({ error: 'Wheel not found' });
      }

      // Verify the wheel's company is active
      if (!wheel.company || !wheel.company.isActive) {
        return res.status(403).json({ error: 'Company is not active' });
      }

      // If wheel has no slots, create default ones
      if (!wheel.slots || wheel.slots.length === 0) {
        console.log(`Wheel ${wheelId} has no slots. Creating default slots...`);
        await ensureWheelHasSlots(wheelId);
        
        // Fetch the wheel again with the new slots
        const updatedWheel = await prisma.wheel.findUnique({
          where: {
            id: wheelId,
            isActive: true
          },
          include: {
            slots: {
              where: { isActive: true },
              orderBy: { position: 'asc' }
            }
          }
        });
        
        if (!updatedWheel || !updatedWheel.slots || updatedWheel.slots.length === 0) {
          return res.status(500).json({ error: 'Failed to create default slots for wheel' });
        }
        
        // Return updated wheel with the new slots
        return res.status(200).json({
          wheel: {
            id: updatedWheel.id,
            name: updatedWheel.name,
            formSchema: updatedWheel.formSchema,
            socialNetwork: updatedWheel.socialNetwork,
            redirectUrl: updatedWheel.redirectUrl,
            redirectText: updatedWheel.redirectText,
            playLimit: updatedWheel.playLimit,
            gameRules: updatedWheel.gameRules,
            footerText: updatedWheel.footerText,
            mainTitle: updatedWheel.mainTitle,
            bannerImage: updatedWheel.bannerImage,
            backgroundImage: updatedWheel.backgroundImage,
            slots: applyStableSorting(updatedWheel.slots).map(slot => ({
              id: slot.id,
              label: slot.label,
              color: slot.color,
              weight: slot.weight,
              isWinning: slot.isWinning,
              position: slot.position
            }))
          }
        });
      }

      // Return only necessary data for public view
      return res.status(200).json({
        wheel: {
          id: wheel.id,
          name: wheel.name,
          formSchema: wheel.formSchema,
          socialNetwork: wheel.socialNetwork,
          redirectUrl: wheel.redirectUrl,
          redirectText: wheel.redirectText,
          playLimit: wheel.playLimit,
          gameRules: wheel.gameRules,
          footerText: wheel.footerText,
          mainTitle: wheel.mainTitle,
          bannerImage: wheel.bannerImage,
          backgroundImage: wheel.backgroundImage,
          slots: applyStableSorting(wheel.slots).map(slot => ({
            id: slot.id,
            label: slot.label,
            color: slot.color,
            weight: slot.weight,
            isWinning: slot.isWinning,
            position: slot.position
          }))
        }
      });
    }

    // Standard flow with company ID validation
    // First check if company exists at all
    const companyCheck = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!companyCheck) {
      console.log(`Company not found with ID: ${companyId}`);
      return res.status(404).json({ error: 'Company not found' });
    }

    console.log(`Company found: ${companyCheck.name}, isActive: ${companyCheck.isActive}`);

    // If company exists but is not active, return appropriate message
    if (!companyCheck.isActive) {
      return res.status(403).json({ error: 'Company is not active' });
    }

    // Find the wheel with its slots
    const wheel = await prisma.wheel.findUnique({
      where: {
        id: wheelId,
        companyId,
        isActive: true
      },
      include: {
        slots: {
          where: { isActive: true },
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!wheel) {
      console.log(`Wheel not found: ${wheelId} for company ${companyId}`);
      return res.status(404).json({ error: 'Wheel not found' });
    }

    // If wheel has no slots, create default ones
    if (!wheel.slots || wheel.slots.length === 0) {
      console.log(`Wheel ${wheelId} has no slots. Creating default slots...`);
      await ensureWheelHasSlots(wheelId);
      
      // Fetch the wheel again with the new slots
      const updatedWheel = await prisma.wheel.findUnique({
        where: {
          id: wheelId,
          companyId,
          isActive: true
        },
        include: {
          slots: {
            where: { isActive: true },
            orderBy: { position: 'asc' }
          }
        }
      });
      
      if (!updatedWheel || !updatedWheel.slots || updatedWheel.slots.length === 0) {
        return res.status(500).json({ error: 'Failed to create default slots for wheel' });
      }
      
      // Return updated wheel with the new slots
      return res.status(200).json({
        wheel: {
          id: updatedWheel.id,
          name: updatedWheel.name,
          formSchema: updatedWheel.formSchema,
          socialNetwork: updatedWheel.socialNetwork,
          redirectUrl: updatedWheel.redirectUrl,
          redirectText: updatedWheel.redirectText,
          playLimit: updatedWheel.playLimit,
          gameRules: updatedWheel.gameRules,
          footerText: updatedWheel.footerText,
          mainTitle: updatedWheel.mainTitle,
          bannerImage: updatedWheel.bannerImage,
          backgroundImage: updatedWheel.backgroundImage,
          slots: applyStableSorting(updatedWheel.slots).map(slot => ({
            id: slot.id,
            label: slot.label,
            color: slot.color,
            weight: slot.weight,
            isWinning: slot.isWinning,
            position: slot.position
          }))
        }
      });
    }

    // Return only necessary data for public view
    return res.status(200).json({
      wheel: {
        id: wheel.id,
        name: wheel.name,
        formSchema: wheel.formSchema,
        socialNetwork: wheel.socialNetwork,
        redirectUrl: wheel.redirectUrl,
        redirectText: wheel.redirectText,
        playLimit: wheel.playLimit,
        gameRules: wheel.gameRules,
        footerText: wheel.footerText,
        mainTitle: wheel.mainTitle,
        bannerImage: wheel.bannerImage,
        backgroundImage: wheel.backgroundImage,
        slots: applyStableSorting(wheel.slots).map(slot => ({
          id: slot.id,
          label: slot.label,
          color: slot.color,
          weight: slot.weight,
          isWinning: slot.isWinning,
          position: slot.position
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching public wheel:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Spin the wheel and record the result
 */
export const spinWheel = async (req: Request, res: Response) => {
  try {
    const { companyId, wheelId } = req.params;
    const { lead } = req.body;

    console.log('Received spin request:', {
      companyId,
      wheelId,
      lead
    });

    // Validate wheel ID - this is always required
    if (!wheelId) {
      return res.status(400).json({ 
        error: 'Wheel ID is required' 
      });
    }

    if (!lead || typeof lead !== 'object' || Object.keys(lead).length === 0) {
      return res.status(400).json({ 
        error: 'Lead information is required and must contain at least one field' 
      });
    }

    // Get IP address for play limit checking
    const ip = getRealClientIP(req);
    
    // Debug: Log IP detection information
    console.log('🔍 IP Detection Debug:', {
      capturedIP: ip,
      reqIP: req.ip,
      remoteAddress: req.socket.remoteAddress,
      xForwardedFor: req.get('X-Forwarded-For'),
      xRealIP: req.get('X-Real-IP'),
      cfConnectingIP: req.get('CF-Connecting-IP'),
      userAgent: req.get('User-Agent')?.substring(0, 100) + '...'
    });

    // Check if we're using the fallback route (no companyId provided)
    let wheel;
    let actualCompanyId = companyId;

    if (!companyId || companyId === 'undefined' || companyId === 'null') {
      console.log(`No valid company ID provided, using direct wheel lookup`);
      
      // Find the wheel without requiring a specific company
      wheel = await prisma.wheel.findUnique({
        where: {
          id: wheelId,
          isActive: true
        },
        include: {
          company: true,
          slots: {
            where: { isActive: true },
            orderBy: { position: 'asc' }
          }
        }
      });

      if (!wheel || !wheel.company) {
        return res.status(404).json({ error: 'Wheel not found or has no associated company' });
      }

      // Use the actual company ID from the wheel
      actualCompanyId = wheel.company.id;
      
      // Verify the wheel's company is active
      if (!wheel.company.isActive) {
        return res.status(403).json({ error: 'Company is not active' });
      }
    } else {
      // Standard flow with company ID validation
      // Find the wheel with its slots (include mode) - ORDER BY POSITION
      wheel = await prisma.wheel.findUnique({
        where: {
          id: wheelId,
          companyId: actualCompanyId,
          isActive: true
        },
        include: {
          slots: {
            where: { isActive: true },
            orderBy: { position: 'asc' }
          }
        }
      });
    }

    if (!wheel) {
      return res.status(404).json({ error: 'Wheel not found' });
    }

    if (!wheel.slots || wheel.slots.length === 0) {
      console.error('Wheel has no active slots:', wheelId);
      return res.status(400).json({ error: 'Wheel has no active slots' });
    }

    // Check play limits based on wheel.playLimit setting
    if (wheel.playLimit && wheel.playLimit !== 'UNLIMITED') {
      const now = new Date();
      let timeRestriction = {};
      
      if (wheel.playLimit === 'ONCE_PER_DAY') {
        // Check for plays from the same IP in the last 24 hours
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        timeRestriction = {
          createdAt: {
            gte: yesterday
          }
        };
      } else if (wheel.playLimit === 'ONCE_PER_MONTH') {
        // Check for plays from the same IP in the last 30 days
        const lastMonth = new Date();
        lastMonth.setDate(now.getDate() - 30);
        timeRestriction = {
          createdAt: {
            gte: lastMonth
          }
        };
      }

      // Check if this IP has already played within the time restriction
      const existingPlay = await prisma.play.findFirst({
        where: {
          wheelId: wheelId,
          ip: ip,
          ...timeRestriction
        }
      });

      if (existingPlay) {
        const limitText = wheel.playLimit === 'ONCE_PER_DAY' ? 'once per day' : 'once per month';
        return res.status(429).json({ 
          error: `Play limit exceeded. This wheel can only be played ${limitText}.`,
          code: 'PLAY_LIMIT_EXCEEDED',
          playLimit: wheel.playLimit
        });
      }
    }

    // Log the slots for debugging
    console.log(`Found ${wheel.slots.length} active slots for wheel ${wheelId}`);
    console.log(`🎯 Prize selection debug - Wheel ${wheelId}:`, {
      totalSlots: wheel.slots.length,
      slotsInPositionOrder: wheel.slots.map((s, index) => ({
        dbIndex: index,
        position: s.position,
        id: s.id,
        label: s.label,
        isWinning: s.isWinning
      }))
    });

    // CRITICAL: Apply stable sorting to match frontend behavior
    // This ensures backend and frontend use identical slot ordering
    const stableSortedSlots = applyStableSorting(wheel.slots);
    
    console.log(`🎯 After stable sorting:`, {
      stableSortedSlots: stableSortedSlots.map((s, index) => ({
        stableIndex: index,
        position: s.position,
        id: s.id,
        label: s.label,
        isWinning: s.isWinning
      }))
    });

    // --- NEW LOGIC FOR ALL_WIN MODE ---
    let slot: { id: string; weight: number; isWinning: boolean; label: string; position?: number | null };
    if (wheel.mode === 'ALL_WIN') {
      // Filter winning slots from stable sorted slots
      let winningSlots = stableSortedSlots.filter(s => s.isWinning);
      if (winningSlots.length === 0) {
        // Auto-fix: set all slots to winning
        await prisma.slot.updateMany({
          where: { wheelId: wheel.id, isActive: true },
          data: { isWinning: true }
        });
        // Reload slots WITH POSITION ORDER and apply stable sorting
        const updatedWheel = await prisma.wheel.findUnique({
          where: { id: wheel.id, isActive: true },
          include: { 
            slots: { 
              where: { isActive: true },
              orderBy: { position: 'asc' }
            } 
          }
        });
        if (!updatedWheel || !updatedWheel.slots || updatedWheel.slots.length === 0) {
          return res.status(400).json({ error: 'No slots available for ALL_WIN wheel after auto-fix' });
        }
        winningSlots = applyStableSorting(updatedWheel.slots);
        wheel = updatedWheel; // Update the wheel reference
      }
      // Select a random winning slot
      slot = winningSlots[Math.floor(Math.random() * winningSlots.length)];
      
      console.log(`🎯 ALL_WIN mode - Selected slot:`, {
        selectedSlotId: slot.id,
        selectedSlotLabel: slot.label,
        selectedSlotPosition: slot.position,
        positionInStableSortedArray: stableSortedSlots.findIndex(s => s.id === slot.id)
      });
    } else {
      // Select a slot based on weights using stable sorted slots
      slot = selectSlotByWeight(stableSortedSlots);
      
      console.log(`🎯 Weight-based selection - Selected slot:`, {
        selectedSlotId: slot.id,
        selectedSlotLabel: slot.label,
        selectedSlotPosition: slot.position,
        positionInStableSortedArray: stableSortedSlots.findIndex(s => s.id === slot.id)
      });
    }
    // --- END NEW LOGIC ---
    
    // Generate PIN and QR code for winning slots
    let pin = null;
    let qrLink = null;
    
    // For ALL_WIN, always treat as win; for others, check slot.isWinning
    const isWin = wheel.mode === 'ALL_WIN' ? true : slot.isWinning;
    if (isWin) {
      pin = generatePIN();
      // Use the playId format instead of wheelId_pin for redemption
      const baseUrl = 'https://roue.izikado.fr';
      
      try {
        // We'll create a temporary placeholder for the playId that will be replaced after creation
        // Use a more unique temporary ID to avoid collisions
        const tempPlayId = `TEMP_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        qrLink = await generateQRCode(`${baseUrl}/redeem/${tempPlayId}`);
        
        // Log success
        console.log(`Generated temporary QR code for future play with wheel ${wheelId}`);
      } catch (qrError) {
        console.error('Failed to generate QR code:', qrError);
        // Fall back to a text-based QR (will be updated later)
        qrLink = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQAQAAAABzZPLDAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAd2KE6QAAAAHdElNRQfkCxENNSdM1VJ/AAAAAXdJREFUaN7t2kGOwyAMBVDfiBP4/vfIFiRwMp1FRkhtQiXL7UxrPFL0lqDwYxnGWPZaOL4LJJBAAvm/SPAECeS3kPDmiHKjSfXH5JpazxwuM/UeGUhYDiLV2HFIImklmn6cOVJBkiQy8YlQUg1ydRNI7qMrr6kqEEjHI8S0NF3LtKCSJEmEg6h3Xo2kqqYeCSSQ+yqZbrSyRyCQQG4hPVNI2HLVu9tq7jqsm7Ga2VIlZ5JXyBPX5LMg8SXk+VRKUwYSyMuIJTCLXlzZmkuXHSQUvY5c2iBJ1a+OfAcJX0YqQZF0PWYyffCB3A2pvZtWXk1NRSBvIFSiqE6lUHYDCeT9xL7TZDkMBPI+Ul2r2TRO8mpbzbeQejbF6j5aeQuSkiRpBu5AIIHcDdmpYAYJJJC7IcFSPEpBQCDvJnUtSZpR1zxAvoakzTTrVIkq1QnkXcRaRrKx54tSSJJvIfmP30wgkEBuhdS1DL8FEkggP4z8AFbPZjysVrLUAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIwLTExLTE3VDEzOjUzOjM5KzAxOjAwkTgpvQAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMC0xMS0xN1QxMzo1MzozOSswMTowMOBlkQEAAAAASUVORK5CYII=';
      }
    }

    // Record the play in the database
    const play = await prisma.play.create({
      data: {
        wheelId,
        companyId: actualCompanyId,
        slotId: slot.id,
        leadInfo: lead,
        result: isWin ? 'WIN' : 'LOSE',
        pin: pin,
        qrLink: qrLink,
        ip: ip
      }
    });

    // Log the play activity for traceability
    try {
      await logPlayActivity({
        playId: play.id,
        wheelId: wheelId,
        companyId: actualCompanyId,
        result: isWin ? 'WIN' : 'LOSE',
        slotLabel: slot.label,
        pin: pin || undefined,
        ipAddress: ip,
        userAgent: req.get('User-Agent') || undefined,
        leadInfo: lead
      });
    } catch (logError) {
      console.error('Failed to log play activity:', logError);
      // Don't fail the request if logging fails
    }

    // If this is a winning play, update the QR code with the actual playId
    if (isWin && qrLink) {
      try {
        const baseUrl = 'https://roue.izikado.fr';
        const updatedQrLink = await generateQRCode(`${baseUrl}/redeem/${play.id}`);
        
        // Update the play with the correct QR code
        await prisma.play.update({
          where: { id: play.id },
          data: { qrLink: updatedQrLink }
        });
        
        // Use the updated QR code for the response
        qrLink = updatedQrLink;
        
        console.log(`Updated QR code for play ${play.id}`);
      } catch (qrUpdateError) {
        console.error('Failed to update QR code with actual playId:', qrUpdateError);
        // Keep the temporary QR code; it will be unusable but at least something displays
      }
    }

    console.log(`🎯 Final spin result:`, {
      playId: play.id,
      result: play.result,
      selectedSlotId: slot.id,
      selectedSlotLabel: slot.label,
      selectedSlotPosition: slot.position,
      frontendShouldShowIndex: stableSortedSlots.findIndex(s => s.id === slot.id)
    });

    // CRITICAL FIX: Calculate the exact prizeIndex that frontend needs
    const prizeIndex = stableSortedSlots.findIndex(s => s.id === slot.id);
    
    console.log(`🎯 WHEEL ALIGNMENT FIX: Returning prizeIndex ${prizeIndex} for slot "${slot.label}" (ID: ${slot.id})`);

    // Return the result
    return res.status(200).json({
      play: {
        id: play.id,
        result: play.result,
        ...(play.result === 'WIN' && {
          prize: {
            pin: play.pin,
            qrLink: qrLink // Use the updated QR code
          }
        })
      },
      slot: {
        id: slot.id,
        label: slot.label
      },
      prizeIndex: prizeIndex // CRITICAL: Add the exact index for wheel alignment
    });
  } catch (error) {
    console.error('Error spinning wheel:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get prize details for redemption
 */
export const getPrizeDetails = async (req: Request, res: Response) => {
  try {
    const { playId } = req.params;

    if (!playId) {
      return res.status(400).json({ error: 'Play ID is required' });
    }

    // Validate UUID format using regex for basic validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(playId)) {
      console.error(`Invalid UUID format for playId: ${playId}`);
      return res.status(400).json({ error: 'Invalid play ID format', validationError: true });
    }

    // Check if play exists before attempting to fetch details
    const playExists = await checkPlayExists(playId);
    if (!playExists) {
      return res.status(404).json({ 
        error: 'Play not found', 
        details: 'No play record found with the provided ID' 
      });
    }

    // Find the play with full details
    const play = await prisma.play.findUnique({
      where: { id: playId },
      include: {
        slot: true
      }
    });

    if (!play) {
      console.error(`Play not found for ID: ${playId}`);
      return res.status(404).json({ error: 'Play not found' });
    }

    // Only winning plays can be redeemed
    if (play.result !== 'WIN') {
      return res.status(400).json({ error: 'This play did not result in a prize' });
    }

    console.log(`Successfully fetched prize details for playId: ${playId}`);
    return res.status(200).json({
      id: play.id,
      pin: play.pin,
      status: play.redemptionStatus,
      prize: {
        label: play.slot.label,
        description: play.slot.description
      },
      lead: play.leadInfo
    });
  } catch (error) {
    console.error('Error fetching prize details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Redeem a prize
 */
export const redeemPrize = async (req: Request, res: Response) => {
  try {
    const { playId } = req.params;
    const { pin } = req.body;

    if (!playId || !pin) {
      return res.status(400).json({ error: 'Play ID and PIN are required' });
    }

    // Find the play
    const play = await prisma.play.findUnique({
      where: { id: playId },
      include: {
        slot: true
      }
    });

    if (!play) {
      return res.status(404).json({ error: 'Play not found' });
    }

    // Verify PIN
    if (play.pin !== pin) {
      return res.status(400).json({ error: 'Invalid PIN' });
    }

    // Check if already redeemed
    if (play.redemptionStatus === 'REDEEMED') {
      return res.status(400).json({ error: 'Prize already redeemed' });
    }

    // Update redemption status
    const updatedPlay = await prisma.play.update({
      where: { id: playId },
      data: { 
        redemptionStatus: 'REDEEMED',
        redeemedAt: new Date()
      }
    });

    return res.status(200).json({
      id: updatedPlay.id,
      status: updatedPlay.redemptionStatus,
      redeemedAt: updatedPlay.redeemedAt
    });
  } catch (error) {
    console.error('Error redeeming prize:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Claim a prize by submitting contact information
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

    // Find the play
    const play = await prisma.play.findUnique({
      where: { id: playId },
      include: {
        slot: true
      }
    });

    if (!play) {
      return res.status(404).json({ error: 'Play not found' });
    }

    // Only winning plays can be claimed
    if (play.result !== 'WIN') {
      return res.status(400).json({ error: 'This play did not result in a prize' });
    }

    // Check if already claimed
    if (play.redemptionStatus === 'CLAIMED') {
      return res.status(400).json({ error: 'Prize already claimed' });
    }

    // Update the play with lead information and mark as claimed
    const claimData = {
      name,
      email,
      phone: phone || undefined,
      birthDate: birthDate || undefined
    };

    const updatedPlay = await prisma.play.update({
      where: { id: playId },
      data: { 
        leadInfo: claimData,
        redemptionStatus: 'CLAIMED',
        claimedAt: new Date()
      }
    });

    // Send prize notification email
    try {
      await sendPrizeEmail(
        email,
        play.slot.label || 'Your Prize',
        play.qrLink || '',
        play.pin || '',
        playId,
        play.companyId
      );
      console.log(`Prize notification email sent to ${email} for play ${playId}`);
    } catch (emailError) {
      console.error('Failed to send prize email:', emailError);
      // Don't fail the request if email fails - the prize is still claimed
    }

    return res.status(200).json({
      id: updatedPlay.id,
      status: updatedPlay.redemptionStatus,
      claimedAt: updatedPlay.claimedAt,
      message: 'Prize claimed successfully! You will receive an email with redemption details.'
    });
  } catch (error) {
    console.error('Error claiming prize:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Select a slot based on weight distribution
 */
function selectSlotByWeight(slots: { id: string; weight: number; isWinning: boolean; label: string; position?: number }[]) {
  // Calculate total weight
  const totalWeight = slots.reduce((sum, slot) => sum + slot.weight, 0);
  
  // Generate a random number between 0 and totalWeight
  const random = Math.random() * totalWeight;
  
  // Select the slot
  let cumulativeWeight = 0;
  for (const slot of slots) {
    cumulativeWeight += slot.weight;
    if (random <= cumulativeWeight) {
      return slot;
    }
  }
  
  // Fallback to first slot (shouldn't happen)
  return slots[0];
}

/**
 * Debug endpoint to validate playId
 */
export const debugPlayId = async (req: Request, res: Response) => {
  try {
    const { playId } = req.params;
    
    if (!playId) {
      return res.status(400).json({ error: 'Play ID is required' });
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUuid = uuidRegex.test(playId);
    
    // Check if play exists
    const playExists = await checkPlayExists(playId);
    
    // Get more diagnostics if the play exists
    let playDetails = null;
    if (playExists) {
      const play = await prisma.play.findUnique({
        where: { id: playId },
        select: {
          id: true,
          result: true,
          redemptionStatus: true,
          createdAt: true,
          pin: true,
          qrLink: true
        }
      });
      
      playDetails = play;
    }
    
    // Return diagnostic information
    return res.status(200).json({
      diagnostics: {
        playId,
        isValidUuidFormat: isValidUuid,
        existsInDatabase: playExists,
        details: playDetails
      }
    });
  } catch (error) {
    console.error('Error in play ID debug endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get wheel data for the special /company/:wheelId route
 */
export const getCompanyWheel = async (req: Request, res: Response) => {
  try {
    const { wheelId } = req.params;

    console.log(`getCompanyWheel called with params:`, {
      wheelId,
      path: req.path,
      originalUrl: req.originalUrl,
      hostname: req.hostname,
      ip: req.ip
    });

    // Validate wheel ID - this is always required
    if (!wheelId) {
      return res.status(400).json({
        error: 'Wheel ID is required'
      });
    }

    console.log(`Looking for wheel ${wheelId} via company route`);

    // Special handling for company routes where companyId might be "company"
    const wheel = await prisma.wheel.findUnique({
      where: { id: wheelId, isActive: true },
      include: {
        company: true,
        slots: {
          where: { isActive: true },
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!wheel) {
      console.log(`Wheel not found: ${wheelId}`);
      return res.status(404).json({ error: 'Wheel not found' });
    }

    // Debug: Log the raw wheel data from database
    console.log(`Raw wheel data from database:`, {
      id: wheel.id,
      name: wheel.name,
      bannerImage: wheel.bannerImage,
      backgroundImage: wheel.backgroundImage,
      gameRules: wheel.gameRules,
      footerText: wheel.footerText,
      mainTitle: wheel.mainTitle,
      hasCompany: !!wheel.company,
      companyActive: wheel.company?.isActive,
      slotsCount: wheel.slots?.length || 0
    });

    // Verify the wheel's company is active
    if (!wheel.company || !wheel.company.isActive) {
      return res.status(403).json({ error: 'Company is not active' });
    }

    // Prepare the response data
    const responseData = {
      wheel: {
        id: wheel.id,
        name: wheel.name,
        formSchema: wheel.formSchema,
        socialNetwork: wheel.socialNetwork,
        redirectUrl: wheel.redirectUrl,
        redirectText: wheel.redirectText,
        playLimit: wheel.playLimit,
        gameRules: wheel.gameRules,
        footerText: wheel.footerText,
        mainTitle: wheel.mainTitle,
        bannerImage: wheel.bannerImage,
        backgroundImage: wheel.backgroundImage,
                  slots: applyStableSorting(wheel.slots).map(slot => ({
            id: slot.id,
            label: slot.label,
            color: slot.color,
            weight: slot.weight,
            isWinning: slot.isWinning,
            position: slot.position
          }))
      }
    };

    // Debug: Log what we're about to return
    console.log(`Response data being sent:`, {
      wheelId: responseData.wheel.id,
      name: responseData.wheel.name,
      bannerImage: responseData.wheel.bannerImage,
      backgroundImage: responseData.wheel.backgroundImage,
      gameRules: responseData.wheel.gameRules,
      footerText: responseData.wheel.footerText,
      mainTitle: responseData.wheel.mainTitle,
      responseKeys: Object.keys(responseData.wheel)
    });

    // Return only necessary data for public view
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching company wheel:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Debug endpoint to check raw wheel data
 */
export const debugWheelData = async (req: Request, res: Response) => {
  try {
    const { wheelId } = req.params;

    if (!wheelId) {
      return res.status(400).json({ error: 'Wheel ID is required' });
    }

    console.log(`Debug: Fetching raw data for wheel ${wheelId}`);

    // Get raw wheel data
    const wheel = await prisma.wheel.findUnique({
      where: { id: wheelId }
    });

    if (!wheel) {
      return res.status(404).json({ error: 'Wheel not found' });
    }

    // Return absolutely everything
    return res.status(200).json({
      debug: true,
      rawWheel: wheel,
      imageFields: {
        bannerImage: wheel.bannerImage,
        backgroundImage: wheel.backgroundImage,
        bannerImageType: typeof wheel.bannerImage,
        backgroundImageType: typeof wheel.backgroundImage,
        bannerImageLength: wheel.bannerImage?.length || 0,
        backgroundImageLength: wheel.backgroundImage?.length || 0
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Export sendPrizeEmail for testing
export { sendPrizeEmail };

/**
 * Apply stable sorting to slots - matches frontend logic exactly
 * When positions are equal, uses slot ID as tiebreaker for consistent ordering
 */
function applyStableSorting(slots: any[]) {
  return [...slots].sort((a, b) => {
    const posA = a.position !== undefined ? a.position : 999;
    const posB = b.position !== undefined ? b.position : 999;
    
    // If positions are equal, use slot ID as stable tiebreaker
    if (posA === posB) {
      return a.id.localeCompare(b.id);
    }
    
    return posA - posB;
  });
} 