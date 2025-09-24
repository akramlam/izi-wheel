import prisma from '../../utils/db';
import { formatWheelResponse } from '../../utils/slot-utils';

export interface WheelLookupOptions {
  wheelId: string;
  companyId?: string;
}

export interface WheelData {
  id: string;
  name: string;
  formSchema: any;
  socialNetwork?: string;
  redirectUrl?: string;
  redirectText?: string;
  playLimit?: string;
  gameRules?: string;
  footerText?: string;
  mainTitle?: string;
  bannerImage?: string;
  backgroundImage?: string;
  slots: Array<{
    id: string;
    label: string;
    color: string;
    weight: number;
    isWinning: boolean;
    position: number | null;
  }>;
  company?: {
    id: string;
    isActive: boolean;
  };
}

/**
 * Find wheel by ID with optional company validation
 */
export async function findWheelById(options: WheelLookupOptions): Promise<WheelData | null> {
  const { wheelId, companyId } = options;

  console.log(`Looking for wheel ${wheelId}${companyId ? ` and company ${companyId}` : ' without company ID'}`);

  // Build the where clause dynamically
  const whereClause: any = {
    id: wheelId,
    isActive: true
  };

  // Add company validation if provided and not a special case
  if (companyId && companyId !== 'company' && companyId !== 'undefined' && companyId !== 'null') {
    whereClause.company = {
      id: companyId,
      isActive: true
    };
  }

  const wheel = await prisma.wheel.findUnique({
    where: whereClause,
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
    return null;
  }

  // Verify the wheel's company is active
  if (!wheel.company || !wheel.company.isActive) {
    console.log('Company is not active');
    return null;
  }

  return wheel as WheelData;
}

/**
 * Get public wheel data formatted for frontend
 */
export async function getPublicWheelData(options: WheelLookupOptions) {
  const { wheelId, companyId } = options;

  // Special case: If companyId is 'company', treat it as a direct wheel lookup
  if (companyId === 'company') {
    console.log(`Special case: companyId is 'company', using direct wheel lookup for ${wheelId}`);
  }

  const wheel = await findWheelById(options);

  if (!wheel) {
    return null;
  }

  // Return formatted wheel data using the existing utility
  return formatWheelResponse(wheel);
}