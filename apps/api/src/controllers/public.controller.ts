import { Request, Response } from 'express';
import { prisma } from '../utils/db';
import { generateQRCode } from '../utils/qrcode';
import { generatePIN } from '../utils/pin';

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

    // Find the company
    const company = await prisma.company.findUnique({
      where: { 
        id: companyId,
        isActive: true 
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
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
      return res.status(404).json({ error: 'Wheel not found' });
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

    // Validate input
    if (!companyId || !wheelId) {
      return res.status(400).json({ 
        error: 'Company ID and Wheel ID are required' 
      });
    }

    if (!lead || typeof lead !== 'object') {
      return res.status(400).json({ 
        error: 'Lead information is required' 
      });
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
          where: { isActive: true }
        }
      }
    });

    if (!wheel) {
      return res.status(404).json({ error: 'Wheel not found' });
    }

    if (wheel.slots.length === 0) {
      return res.status(400).json({ error: 'Wheel has no active slots' });
    }

    // Select a slot based on weights
    const slot = selectSlotByWeight(wheel.slots);
    
    // Generate PIN and QR code for winning slots
    let pin = null;
    let qrLink = null;
    
    if (slot.isWinning) {
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
        result: slot.isWinning ? 'WIN' : 'LOSE',
        pin: pin,
        qrLink: qrLink,
        ip: req.ip || req.socket.remoteAddress || null
      }
    });

    // If this is a winning play, update the QR code with the actual playId
    if (slot.isWinning && qrLink) {
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

    // Only winning plays can be redeemed
    if (play.result !== 'WIN') {
      return res.status(400).json({ error: 'This play did not result in a prize' });
    }

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