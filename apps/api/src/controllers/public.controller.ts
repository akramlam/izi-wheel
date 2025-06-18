import { Request, Response } from 'express';
import prisma, { checkPlayExists } from '../utils/db';
import { generateQRCode } from '../utils/qrcode';
import { generatePIN } from '../utils/pin';
import { ensureWheelHasSlots } from '../utils/db-init';
import { sendPrizeEmail } from '../utils/mailer';
import { logPlayActivity } from '../utils/activity-logger';

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
          slots: wheel.slots.map(slot => ({
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
            slots: updatedWheel.slots.map(slot => ({
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
          slots: wheel.slots.map(slot => ({
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
          slots: updatedWheel.slots.map(slot => ({
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
        slots: wheel.slots.map(slot => ({
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
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';

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
            where: { isActive: true }
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
      // Find the wheel with its slots (include mode)
      wheel = await prisma.wheel.findUnique({
        where: {
          id: wheelId,
          companyId: actualCompanyId,
          isActive: true
        },
        include: {
          slots: {
            where: { isActive: true }
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

    // --- NEW LOGIC FOR ALL_WIN MODE ---
    let slot;
    if (wheel.mode === 'ALL_WIN') {
      // Filter winning slots
      let winningSlots = wheel.slots.filter(s => s.isWinning);
      if (winningSlots.length === 0) {
        // Auto-fix: set all slots to winning
        await prisma.slot.updateMany({
          where: { wheelId: wheel.id, isActive: true },
          data: { isWinning: true }
        });
        // Reload slots
        const updatedWheel = await prisma.wheel.findUnique({
          where: { id: wheelId, isActive: true },
          include: { slots: { where: { isActive: true } } }
        });
        if (!updatedWheel || !updatedWheel.slots || updatedWheel.slots.length === 0) {
          return res.status(400).json({ error: 'No slots available for ALL_WIN wheel after auto-fix' });
        }
        winningSlots = updatedWheel.slots;
      }
      // Select a random winning slot
      slot = winningSlots[Math.floor(Math.random() * winningSlots.length)];
    } else {
      // Select a slot based on weights (original logic)
      slot = selectSlotByWeight(wheel.slots);
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
        const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
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
      }
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
 * Helper function to select a slot based on weights
 */
function selectSlotByWeight(slots: { id: string; weight: number; isWinning: boolean; label: string }[]) {
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

    // Validate wheel ID - this is always required
    if (!wheelId) {
      return res.status(400).json({
        error: 'Wheel ID is required'
      });
    }

    console.log(`Looking for wheel ${wheelId} using company route`);

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
        slots: wheel.slots.map(slot => ({
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
    console.error('Error fetching company wheel:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Export sendPrizeEmail for testing
export { sendPrizeEmail }; 