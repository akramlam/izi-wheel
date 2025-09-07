import { Request, Response } from 'express';
import prisma from '../utils/db';
import { ensureWheelHasSlots } from '../utils/db-init';
import { getRealClientIP } from '../utils/ip';
import { formatWheelResponse } from '../utils/slot-utils';
import { spinWheel } from './public.controller';

/**
 * Validates that a wheel ID is provided in the request
 */
const validateWheelId = (wheelId: string | undefined): string | null => {
  if (!wheelId) {
    return 'Wheel ID is required';
  }
  return null;
};

/**
 * Fetches a wheel with its slots and company data
 */
const fetchWheelWithSlots = async (wheelId: string) => {
  return await prisma.wheel.findUnique({
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
};

/**
 * Ensures wheel has slots by creating defaults if needed
 */
const ensureWheelHasSlotsAndReturn = async (wheelId: string) => {
  console.log(`Wheel ${wheelId} has no slots. Creating default slots...`);
  await ensureWheelHasSlots(wheelId);
  
  const updatedWheel = await fetchWheelWithSlots(wheelId);
  
  if (!updatedWheel?.slots?.length) {
    throw new Error('Failed to create default slots for wheel');
  }
  
  return updatedWheel;
};

/**
 * Get wheel data for the /company/:wheelId route
 */
export const getCompanyWheel = async (req: Request, res: Response) => {
  try {
    const { wheelId } = req.params;

    // Log request details for debugging
    console.log('getCompanyWheel called with params:', {
      wheelId,
      path: req.path,
      originalUrl: req.originalUrl,
      hostname: req.hostname,
      ip: req.ip
    });

    // Validate input
    const validationError = validateWheelId(wheelId);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    console.log(`Looking for wheel ${wheelId} via company route`);

    // Fetch wheel data
    let wheel = await fetchWheelWithSlots(wheelId);

    if (!wheel) {
      console.log(`Wheel not found: ${wheelId}`);
      return res.status(404).json({ error: 'Wheel not found' });
    }

    // Verify company is active
    if (!wheel.company?.isActive) {
      return res.status(403).json({ error: 'Company is not active' });
    }
    
    // Ensure wheel has slots
    if (!wheel.slots?.length) {
      wheel = await ensureWheelHasSlotsAndReturn(wheelId);
    }

    // Return formatted response
    return res.status(200).json(formatWheelResponse(wheel));
  } catch (error) {
    console.error('Error in getCompanyWheel:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Spin the wheel via the company route
 * This is a wrapper that adds the companyId to the request before forwarding to spinWheel
 */
export const spinCompanyWheel = async (req: Request, res: Response) => {
  try {
    const { wheelId } = req.params;
    const { lead } = req.body;

    // Validate input
    const validationError = validateWheelId(wheelId);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    console.log(`Spinning wheel ${wheelId} via company route with lead data:`, lead);

    // Fetch minimal wheel data to get company ID
    const wheel = await prisma.wheel.findFirst({
      where: {
        id: wheelId,
        isActive: true
      },
      select: {
        companyId: true
      }
    });

    if (!wheel) {
      return res.status(404).json({ error: 'Wheel not found' });
    }

    // Add company ID to request params and forward to standard spinWheel
    req.params.companyId = wheel.companyId;
    
    // Delegate to the main spinWheel function
    return spinWheel(req, res);
  } catch (error) {
    console.error('Error in spinCompanyWheel:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 