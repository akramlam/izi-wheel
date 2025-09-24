import prisma from '../../utils/db';
import { generateQRCode } from '../../utils/qrcode';
import { generatePIN } from '../../utils/pin';
import { logPlayActivity } from '../../utils/activity-logger';
import { getRealClientIP } from '../../utils/ip';
import { applyStableSorting } from '../../utils/slot-utils';

export interface PlayLimitOptions {
  wheelId: string;
  ip: string;
  playLimit?: string;
}

export interface SpinWheelInput {
  wheelId: string;
  companyId?: string;
  userAgent: string;
  ip: string;
  leadInfo?: any;
}

export interface SpinResult {
  play: {
    id: string;
    result: 'WIN' | 'LOSE';
    prize?: {
      pin: string;
      qrLink: string;
    };
  };
  slot: {
    id: string;
    label: string;
    position?: number | null;
  };
  prizeIndex: number;
}

/**
 * Check if user has exceeded play limits
 */
export async function checkPlayLimits({ wheelId, ip, playLimit }: PlayLimitOptions): Promise<{ allowed: boolean; error?: string }> {
  if (!playLimit || playLimit === 'UNLIMITED') {
    return { allowed: true };
  }

  const now = new Date();
  let timeRestriction = {};
  let limitText = '';

  if (playLimit === 'ONCE_PER_DAY') {
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    timeRestriction = {
      createdAt: { gte: yesterday }
    };
    limitText = 'once per day';
  } else if (playLimit === 'ONCE_PER_MONTH') {
    const lastMonth = new Date();
    lastMonth.setDate(now.getDate() - 30);
    timeRestriction = {
      createdAt: { gte: lastMonth }
    };
    limitText = 'once per month';
  } else {
    return { allowed: true };
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
    return {
      allowed: false,
      error: `Play limit exceeded. This wheel can only be played ${limitText}.`
    };
  }

  return { allowed: true };
}

/**
 * Select a winning slot based on wheel mode
 */
function selectWinningSlot(slots: any[], mode: string): any {
  console.log(`🎯 Selecting slot in ${mode} mode from ${slots.length} slots`);

  if (mode === 'ALL_WIN') {
    const winningSlots = slots.filter(s => s.isWinning);
    if (winningSlots.length === 0) {
      throw new Error('No winning slots available in ALL_WIN mode');
    }

    // Random selection from winning slots
    const randomIndex = Math.floor(Math.random() * winningSlots.length);
    const selectedSlot = winningSlots[randomIndex];
    console.log(`🎯 ALL_WIN: Selected slot "${selectedSlot.label}" (index ${randomIndex} of ${winningSlots.length} winning slots)`);
    return selectedSlot;
  } else {
    // RANDOM_WIN mode: weighted selection based on slot weights
    const totalWeight = slots.reduce((sum, slot) => sum + slot.weight, 0);

    if (totalWeight <= 0) {
      throw new Error('Invalid slot weights: total weight must be greater than 0');
    }

    const random = Math.random() * totalWeight;
    let currentWeight = 0;

    for (const slot of slots) {
      currentWeight += slot.weight;
      if (random <= currentWeight) {
        console.log(`🎯 RANDOM_WIN: Selected slot "${slot.label}" (weight: ${slot.weight}/${totalWeight})`);
        return slot;
      }
    }

    // Fallback to last slot (shouldn't happen with correct weights)
    console.warn('🎯 RANDOM_WIN: Fallback to last slot');
    return slots[slots.length - 1];
  }
}

/**
 * Process wheel spin and return result
 */
export async function spinWheel(input: SpinWheelInput): Promise<SpinResult> {
  const { wheelId, companyId, userAgent, ip, leadInfo } = input;

  console.log(`🎯 Processing wheel spin for wheelId: ${wheelId}, IP: ${ip}`);

  // Find the wheel
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
    throw new Error('Wheel not found');
  }

  if (!wheel.company || !wheel.company.isActive) {
    throw new Error('Company is not active');
  }

  if (!wheel.slots || wheel.slots.length === 0) {
    console.error('Wheel has no active slots:', wheelId);
    throw new Error('Wheel has no active slots');
  }

  // Check play limits
  const playLimitCheck = await checkPlayLimits({
    wheelId,
    ip,
    playLimit: wheel.playLimit
  });

  if (!playLimitCheck.allowed) {
    throw new Error(playLimitCheck.error || 'Play limit exceeded');
  }

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

  // Handle ALL_WIN mode - ensure we have winning slots
  let availableSlots = stableSortedSlots;
  if (wheel.mode === 'ALL_WIN') {
    let winningSlots = stableSortedSlots.filter(s => s.isWinning);
    if (winningSlots.length === 0) {
      // Auto-fix: set all slots to winning
      await prisma.slot.updateMany({
        where: { wheelId: wheel.id, isActive: true },
        data: { isWinning: true }
      });

      // Reload and re-sort slots
      const updatedWheel = await prisma.wheel.findUnique({
        where: { id: wheel.id, isActive: true },
        include: {
          slots: {
            where: { isActive: true },
            orderBy: { position: 'asc' }
          }
        }
      });

      if (!updatedWheel) {
        throw new Error('Failed to reload wheel after slot update');
      }

      availableSlots = applyStableSorting(updatedWheel.slots);
      console.log('🎯 Auto-fixed ALL_WIN mode: set all slots to winning');
    }
  }

  // Select the winning slot
  const selectedSlot = selectWinningSlot(availableSlots, wheel.mode || 'RANDOM_WIN');

  // Generate PIN and QR code for winning plays
  let pin: string | null = null;
  let qrLink: string | null = null;

  const isWinning = selectedSlot.isWinning;
  if (isWinning) {
    pin = generatePIN();
    // Generate QR code data for the PIN
    qrLink = await generateQRCode(pin);
  }

  // Create the play record
  const play = await prisma.play.create({
    data: {
      wheelId,
      companyId: wheel.company.id,
      slotId: selectedSlot.id,
      result: isWinning ? 'WIN' : 'LOSE',
      pin,
      qrLink,
      ip,
      leadInfo,
      redemptionStatus: isWinning ? 'PENDING' : undefined
    }
  });

  console.log(`🎯 Created play record:`, {
    playId: play.id,
    result: play.result,
    selectedSlotId: selectedSlot.id,
    selectedSlotLabel: selectedSlot.label,
    selectedSlotPosition: selectedSlot.position,
    pin: play.pin
  });

  // Log activity
  await logPlayActivity({
    playId: play.id,
    wheelId,
    companyId: wheel.company.id,
    result: play.result,
    ipAddress: ip,
    userAgent
  });

  // CRITICAL FIX: Calculate the exact prizeIndex that frontend needs
  const prizeIndex = stableSortedSlots.findIndex(s => s.id === selectedSlot.id);

  console.log(`🎯 WHEEL ALIGNMENT FIX: Returning prizeIndex ${prizeIndex} for slot "${selectedSlot.label}" (ID: ${selectedSlot.id})`);

  // Return the result
  const result: SpinResult = {
    play: {
      id: play.id,
      result: play.result,
      ...(play.result === 'WIN' && pin && qrLink && {
        prize: {
          pin,
          qrLink
        }
      })
    },
    slot: {
      id: selectedSlot.id,
      label: selectedSlot.label,
      position: selectedSlot.position
    },
    prizeIndex // CRITICAL: Add the exact index for wheel alignment
  };

  return result;
}