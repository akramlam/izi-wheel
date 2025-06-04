import { Request, Response } from 'express';
import prisma from '../utils/db';

/**
 * Get wheel data for the /company/:wheelId route
 */
export const getCompanyWheel = async (req: Request, res: Response) => {
  try {
    const { wheelId } = req.params;

    // Log all request parameters for debugging
    console.log('getCompanyWheel called with params:', {
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
    console.error('Error in getCompanyWheel:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Spin the wheel via the company route
 */
export const spinCompanyWheel = async (req: Request, res: Response) => {
  try {
    const { wheelId } = req.params;
    const { lead } = req.body;

    console.log(`Spinning wheel ${wheelId} via company route with lead data:`, lead);

    // Find the wheel first to get its company ID
    const wheel = await prisma.wheel.findUnique({
      where: {
        id: wheelId,
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

    // Now we have the company ID, we can use it to create the play
    const companyId = wheel.companyId;

    // Forward the request to the standard spinWheel function by modifying the request
    req.params.companyId = companyId;
    
    // Import the spinWheel function from the public controller
    const { spinWheel } = require('./public.controller');
    
    // Call the spinWheel function with the modified request
    return spinWheel(req, res);
  } catch (error) {
    console.error('Error in spinCompanyWheel:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 