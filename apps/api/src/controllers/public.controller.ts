import { Request, Response } from 'express';
import prisma, { checkPlayExists } from '../utils/db';
import { generateQRCode } from '../utils/qrcode';
import { generatePIN } from '../utils/pin';
import { ensureWheelHasSlots } from '../utils/db-init';

/**
 * Get public wheel data
 */
export const getPublicWheel = async (req: Request, res: Response) => {
  try {
    const { companyId, wheelId } = req.params;

    // Validate input
    if (!companyId || !wheelId) {
      return res.status(400).json({ 
        error: 'Company ID and Wheel ID are required' 
      });
    }

    console.log(`Looking for company ${companyId} and wheel ${wheelId}`);

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
          slots: updatedWheel.slots.map(slot => ({
            id: slot.id,
            label: slot.label,
            color: slot.color,
            weight: slot.weight,
            isWinning: slot.isWinning
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
        slots: wheel.slots.map(slot => ({
          id: slot.id,
          label: slot.label,
          color: slot.color,
          weight: slot.weight,
          isWinning: slot.isWinning
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

    // Validate input
    if (!companyId || !wheelId) {
      return res.status(400).json({ 
        error: 'Company ID and Wheel ID are required' 
      });
    }

    if (!lead || typeof lead !== 'object' || Object.keys(lead).length === 0) {
      return res.status(400).json({ 
        error: 'Lead information is required and must contain at least one field' 
      });
    }

    // Find the wheel with its slots (include mode)
    const wheel = await prisma.wheel.findUnique({
      where: {
        id: wheelId,
        companyId,
        isActive: true
      },
      include: {
        slots: {
          where: { isActive: true }
        }
      }
    });

    if (!wheel) {
      return res.status(404).json({ error: 'Wheel not found' });
    }

    if (!wheel.slots || wheel.slots.length === 0) {
      console.error('Wheel has no active slots:', wheelId);
      return res.status(400).json({ error: 'Wheel has no active slots' });
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
          where: { id: wheelId, companyId, isActive: true },
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
      const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
      // We'll create a temporary placeholder for the playId that will be replaced after creation
      const tempPlayId = 'TEMP_PLAY_ID';
      qrLink = await generateQRCode(`${baseUrl}/redeem/${tempPlayId}`);
    }

    // Record the play in the database
    const play = await prisma.play.create({
      data: {
        wheelId,
        companyId,
        slotId: slot.id,
        leadInfo: lead,
        result: isWin ? 'WIN' : 'LOSE',
        pin: pin,
        qrLink: qrLink,
        ip: req.ip || req.socket.remoteAddress || null
      }
    });

    // If this is a winning play, update the QR code with the actual playId
    if (isWin && qrLink) {
      const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
      const updatedQrLink = await generateQRCode(`${baseUrl}/redeem/${play.id}`);
      
      // Update the play with the correct QR code
      await prisma.play.update({
        where: { id: play.id },
        data: { qrLink: updatedQrLink }
      });
      
      // Use the updated QR code for the response
      qrLink = updatedQrLink;
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