import { Request, Response } from 'express';
import { getRealClientIP, logIPDebugInfo } from '../utils/ip';
import { sendPrizeEmail } from '../utils/mailer';
import { getPublicWheelData } from '../services/wheel/wheelService';
import { spinWheel } from '../services/wheel/playService';
import {
  getPrizeDetailsByPlayId,
  getPrizeDetailsByPin,
  redeemPrize
} from '../services/wheel/prizeService';

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

    const wheelData = await getPublicWheelData({ wheelId, companyId });

    if (!wheelData) {
      return res.status(404).json({ error: 'Wheel not found' });
    }

    return res.status(200).json(wheelData);

  } catch (error) {
    console.error('Error fetching public wheel:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Play the wheel and get result
 */
export const playWheel = async (req: Request, res: Response) => {
  try {
    const { companyId, wheelId } = req.params;
    const { leadInfo } = req.body;

    // Get user info
    const ip = getRealClientIP(req) || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Log IP debug information
    logIPDebugInfo(req);

    if (!wheelId) {
      return res.status(400).json({ error: 'Wheel ID is required' });
    }

    console.log(`🎯 Play wheel request - Wheel: ${wheelId}, Company: ${companyId || 'N/A'}, IP: ${ip}`);

    const result = await spinWheel({
      wheelId,
      companyId: companyId || undefined,
      userAgent,
      ip,
      leadInfo
    });

    console.log(`🎯 Wheel spin completed:`, {
      playId: result.play.id,
      result: result.play.result,
      slotLabel: result.slot.label,
      prizeIndex: result.prizeIndex
    });

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error spinning wheel:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Play limit exceeded')) {
        return res.status(429).json({
          error: error.message,
          code: 'PLAY_LIMIT_EXCEEDED'
        });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('not active')) {
        return res.status(403).json({ error: error.message });
      }
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get prize details for redemption by play ID
 */
export const getPrizeDetails = async (req: Request, res: Response) => {
  try {
    const { playId } = req.params;

    if (!playId) {
      return res.status(400).json({ error: 'Play ID is required' });
    }

    const prizeDetails = await getPrizeDetailsByPlayId(playId);

    if (!prizeDetails) {
      return res.status(404).json({
        error: 'Play not found',
        details: 'No play record found with the provided ID'
      });
    }

    return res.status(200).json(prizeDetails);

  } catch (error) {
    console.error('Error fetching prize details:', error);

    if (error instanceof Error) {
      if (error.message.includes('Invalid play ID format')) {
        return res.status(400).json({
          error: error.message,
          validationError: true
        });
      }
      if (error.message.includes('did not result in a prize')) {
        return res.status(400).json({ error: error.message });
      }
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Redeem a prize using play ID
 */
export const redeemPrizeById = async (req: Request, res: Response) => {
  try {
    const { playId } = req.params;

    if (!playId) {
      return res.status(400).json({ error: 'Play ID is required' });
    }

    const result = await redeemPrize(playId);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.status(200).json({
      message: result.message,
      prize: result.details
    });

  } catch (error) {
    console.error('Error redeeming prize:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get prize details by PIN
 */
export const getPrizeByPin = async (req: Request, res: Response) => {
  try {
    const { pin } = req.params;

    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    const prizeDetails = await getPrizeDetailsByPin(pin);

    if (!prizeDetails) {
      return res.status(404).json({
        error: 'Prize not found',
        details: 'No prize found for the provided PIN'
      });
    }

    return res.status(200).json(prizeDetails);

  } catch (error) {
    console.error('Error fetching prize by PIN:', error);

    if (error instanceof Error) {
      if (error.message.includes('PIN is required')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('did not result in a prize')) {
        return res.status(400).json({ error: error.message });
      }
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Send prize email
 */
export const sendPrizeEmailNotification = async (req: Request, res: Response) => {
  try {
    const { playId } = req.params;
    const { email } = req.body;

    if (!playId) {
      return res.status(400).json({ error: 'Play ID is required' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const prizeDetails = await getPrizeDetailsByPlayId(playId);

    if (!prizeDetails) {
      return res.status(404).json({ error: 'Prize not found' });
    }

    await sendPrizeEmail(
      email,
      prizeDetails.prize.label,
      prizeDetails.pin,
      prizeDetails.id
    );

    return res.status(200).json({ message: 'Prize email sent successfully' });

  } catch (error) {
    console.error('Error sending prize email:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};