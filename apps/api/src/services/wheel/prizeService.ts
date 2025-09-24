import prisma, { checkPlayExists } from '../../utils/db';

export interface PrizeDetails {
  id: string;
  pin: string;
  status: string;
  prize: {
    label: string;
    description?: string;
  };
  lead: any;
}

export interface RedemptionResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Get prize details for redemption by play ID
 */
export async function getPrizeDetailsByPlayId(playId: string): Promise<PrizeDetails | null> {
  // Validate UUID format using regex for basic validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(playId)) {
    console.error(`Invalid UUID format for playId: ${playId}`);
    throw new Error('Invalid play ID format');
  }

  // Check if play exists before attempting to fetch details
  const playExists = await checkPlayExists(playId);
  if (!playExists) {
    return null;
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
    return null;
  }

  // Only winning plays can be redeemed
  if (play.result !== 'WIN') {
    throw new Error('This play did not result in a prize');
  }

  console.log(`Successfully fetched prize details for playId: ${playId}`);

  return {
    id: play.id,
    pin: play.pin || '',
    status: play.redemptionStatus,
    prize: {
      label: play.slot.label,
      description: play.slot.description || undefined
    },
    lead: play.leadInfo
  };
}

/**
 * Get prize details by PIN
 */
export async function getPrizeDetailsByPin(pin: string): Promise<PrizeDetails | null> {
  if (!pin || pin.trim() === '') {
    throw new Error('PIN is required');
  }

  const cleanPin = pin.trim();

  const play = await prisma.play.findFirst({
    where: { pin: cleanPin },
    include: {
      slot: true
    }
  });

  if (!play) {
    console.log(`Play not found for PIN: ${cleanPin}`);
    return null;
  }

  // Only winning plays can be redeemed
  if (play.result !== 'WIN') {
    throw new Error('This PIN did not result in a prize');
  }

  console.log(`Successfully found prize for PIN: ${cleanPin}`);

  return {
    id: play.id,
    pin: play.pin || '',
    status: play.redemptionStatus,
    prize: {
      label: play.slot.label,
      description: play.slot.description || undefined
    },
    lead: play.leadInfo
  };
}

/**
 * Redeem a prize by play ID
 */
export async function redeemPrize(playId: string): Promise<RedemptionResult> {
  const play = await prisma.play.findUnique({
    where: { id: playId },
    include: { slot: true }
  });

  if (!play) {
    return {
      success: false,
      message: 'Play not found'
    };
  }

  if (play.result !== 'WIN') {
    return {
      success: false,
      message: 'This play did not result in a prize'
    };
  }

  if (play.redemptionStatus === 'REDEEMED') {
    return {
      success: false,
      message: 'Prize has already been redeemed'
    };
  }

  // Update redemption status
  await prisma.play.update({
    where: { id: playId },
    data: {
      redemptionStatus: 'REDEEMED',
      redeemedAt: new Date()
    }
  });

  console.log(`Prize redeemed successfully for playId: ${playId}`);

  return {
    success: true,
    message: 'Prize redeemed successfully',
    details: {
      id: play.id,
      pin: play.pin || '',
      prize: {
        label: play.slot.label,
        description: play.slot.description || undefined
      }
    }
  };
}