import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkPlayLimits, spinWheel } from './playService';
import prisma from '../../utils/db';
import { generatePIN } from '../../utils/pin';
import { generateQRCode } from '../../utils/qrcode';
import { logPlayActivity } from '../../utils/activity-logger';

// Mock dependencies
vi.mock('../../utils/db');
vi.mock('../../utils/pin');
vi.mock('../../utils/qrcode');
vi.mock('../../utils/activity-logger');

const mockPrisma = vi.mocked(prisma);
const mockGeneratePIN = vi.mocked(generatePIN);
const mockGenerateQRCode = vi.mocked(generateQRCode);
const mockLogPlayActivity = vi.mocked(logPlayActivity);

describe('Play Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGeneratePIN.mockReturnValue('TEST123');
    mockGenerateQRCode.mockResolvedValue('mock-qr-link');
    mockLogPlayActivity.mockResolvedValue(undefined);
  });

  describe('checkPlayLimits', () => {
    beforeEach(() => {
      mockPrisma.play.findFirst = vi.fn();
    });

    it('should allow play when limit is UNLIMITED', async () => {
      const result = await checkPlayLimits({
        wheelId: 'wheel-1',
        ip: '192.168.1.1',
        playLimit: 'UNLIMITED'
      });

      expect(result.allowed).toBe(true);
      expect(mockPrisma.play.findFirst).not.toHaveBeenCalled();
    });

    it('should allow play when no limit is set', async () => {
      const result = await checkPlayLimits({
        wheelId: 'wheel-1',
        ip: '192.168.1.1',
        playLimit: undefined
      });

      expect(result.allowed).toBe(true);
      expect(mockPrisma.play.findFirst).not.toHaveBeenCalled();
    });

    it('should check daily limit correctly', async () => {
      mockPrisma.play.findFirst.mockResolvedValue(null); // No existing play

      const result = await checkPlayLimits({
        wheelId: 'wheel-1',
        ip: '192.168.1.1',
        playLimit: 'ONCE_PER_DAY'
      });

      expect(result.allowed).toBe(true);
      expect(mockPrisma.play.findFirst).toHaveBeenCalledWith({
        where: {
          wheelId: 'wheel-1',
          ip: '192.168.1.1',
          createdAt: {
            gte: expect.any(Date)
          }
        }
      });
    });

    it('should reject play when daily limit exceeded', async () => {
      mockPrisma.play.findFirst.mockResolvedValue({ id: 'existing-play' } as any);

      const result = await checkPlayLimits({
        wheelId: 'wheel-1',
        ip: '192.168.1.1',
        playLimit: 'ONCE_PER_DAY'
      });

      expect(result.allowed).toBe(false);
      expect(result.error).toContain('once per day');
    });

    it('should check monthly limit correctly', async () => {
      mockPrisma.play.findFirst.mockResolvedValue(null);

      const result = await checkPlayLimits({
        wheelId: 'wheel-1',
        ip: '192.168.1.1',
        playLimit: 'ONCE_PER_MONTH'
      });

      expect(result.allowed).toBe(true);
      expect(mockPrisma.play.findFirst).toHaveBeenCalledWith({
        where: {
          wheelId: 'wheel-1',
          ip: '192.168.1.1',
          createdAt: {
            gte: expect.any(Date)
          }
        }
      });

      // Verify the date is approximately 30 days ago
      const call = mockPrisma.play.findFirst.mock.calls[0][0];
      const gteDate = call.where.createdAt.gte;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      expect(gteDate.getTime()).toBeCloseTo(thirtyDaysAgo.getTime(), -4); // Within 10 seconds
    });
  });

  describe('spinWheel', () => {
    const mockWheel = {
      id: 'wheel-1',
      mode: 'ALL_WIN',
      playLimit: 'UNLIMITED',
      company: {
        id: 'company-1',
        isActive: true
      },
      slots: [
        {
          id: 'slot-1',
          label: 'Prize A',
          weight: 25,
          isWinning: true,
          position: 0
        },
        {
          id: 'slot-2',
          label: 'Prize B',
          weight: 25,
          isWinning: true,
          position: 1
        },
        {
          id: 'slot-3',
          label: 'No Prize',
          weight: 25,
          isWinning: false,
          position: 2
        },
        {
          id: 'slot-4',
          label: 'Prize C',
          weight: 25,
          isWinning: true,
          position: 3
        }
      ]
    };

    beforeEach(() => {
      mockPrisma.wheel.findUnique = vi.fn();
      mockPrisma.play.create = vi.fn();
      mockPrisma.play.findFirst = vi.fn().mockResolvedValue(null); // No play limit issues
    });

    it('should successfully spin wheel in ALL_WIN mode', async () => {
      mockPrisma.wheel.findUnique.mockResolvedValue(mockWheel);
      mockPrisma.play.create.mockResolvedValue({
        id: 'play-1',
        result: 'WIN',
        pin: 'TEST123'
      } as any);

      const result = await spinWheel({
        wheelId: 'wheel-1',
        userAgent: 'test-agent',
        ip: '192.168.1.1',
        leadInfo: { name: 'Test User' }
      });

      expect(result.play.result).toBe('WIN');
      expect(result.play.prize?.pin).toBe('TEST123');
      expect(result.play.prize?.qrLink).toBe('mock-qr-link');
      expect(result.prizeIndex).toBeGreaterThanOrEqual(0);
      expect(result.prizeIndex).toBeLessThan(4);

      // Verify play was created correctly
      expect(mockPrisma.play.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          wheelId: 'wheel-1',
          companyId: 'company-1',
          result: 'WIN',
          pin: 'TEST123',
          qrLink: 'mock-qr-link',
          ip: '192.168.1.1',
          leadInfo: { name: 'Test User' }
        })
      });
    });

    it('should handle RANDOM_WIN mode with probability', async () => {
      const randomWinWheel = {
        ...mockWheel,
        mode: 'RANDOM_WIN'
      };

      mockPrisma.wheel.findUnique.mockResolvedValue(randomWinWheel);

      // Mock Math.random to always select first slot
      const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1); // Will select first slot

      mockPrisma.play.create.mockResolvedValue({
        id: 'play-1',
        result: 'WIN',
        pin: 'TEST123'
      } as any);

      const result = await spinWheel({
        wheelId: 'wheel-1',
        userAgent: 'test-agent',
        ip: '192.168.1.1'
      });

      expect(result.play.result).toBe('WIN');
      expect(result.slot.id).toBe('slot-1'); // First slot selected

      mathSpy.mockRestore();
    });

    it('should throw error when wheel not found', async () => {
      mockPrisma.wheel.findUnique.mockResolvedValue(null);

      await expect(spinWheel({
        wheelId: 'nonexistent',
        userAgent: 'test-agent',
        ip: '192.168.1.1'
      })).rejects.toThrow('Wheel not found');
    });

    it('should throw error when company not active', async () => {
      const inactiveWheel = {
        ...mockWheel,
        company: { ...mockWheel.company, isActive: false }
      };

      mockPrisma.wheel.findUnique.mockResolvedValue(inactiveWheel);

      await expect(spinWheel({
        wheelId: 'wheel-1',
        userAgent: 'test-agent',
        ip: '192.168.1.1'
      })).rejects.toThrow('Company is not active');
    });

    it('should throw error when no active slots', async () => {
      const emptyWheel = {
        ...mockWheel,
        slots: []
      };

      mockPrisma.wheel.findUnique.mockResolvedValue(emptyWheel);

      await expect(spinWheel({
        wheelId: 'wheel-1',
        userAgent: 'test-agent',
        ip: '192.168.1.1'
      })).rejects.toThrow('Wheel has no active slots');
    });

    it('should respect play limits', async () => {
      const limitedWheel = {
        ...mockWheel,
        playLimit: 'ONCE_PER_DAY'
      };

      mockPrisma.wheel.findUnique.mockResolvedValue(limitedWheel);
      mockPrisma.play.findFirst.mockResolvedValue({ id: 'existing-play' } as any);

      await expect(spinWheel({
        wheelId: 'wheel-1',
        userAgent: 'test-agent',
        ip: '192.168.1.1'
      })).rejects.toThrow('Play limit exceeded');
    });

    it('should auto-fix ALL_WIN mode when no winning slots', async () => {
      const noWinWheel = {
        ...mockWheel,
        mode: 'ALL_WIN',
        slots: mockWheel.slots.map(slot => ({ ...slot, isWinning: false }))
      };

      const fixedWheel = {
        ...noWinWheel,
        slots: noWinWheel.slots.map(slot => ({ ...slot, isWinning: true }))
      };

      mockPrisma.wheel.findUnique
        .mockResolvedValueOnce(noWinWheel) // First call
        .mockResolvedValueOnce(fixedWheel); // After update call

      mockPrisma.slot.updateMany = vi.fn().mockResolvedValue({ count: 4 });
      mockPrisma.play.create.mockResolvedValue({
        id: 'play-1',
        result: 'WIN',
        pin: 'TEST123'
      } as any);

      const result = await spinWheel({
        wheelId: 'wheel-1',
        userAgent: 'test-agent',
        ip: '192.168.1.1'
      });

      expect(mockPrisma.slot.updateMany).toHaveBeenCalledWith({
        where: { wheelId: 'wheel-1', isActive: true },
        data: { isWinning: true }
      });

      expect(result.play.result).toBe('WIN');
    });

    it('should calculate correct prize index for frontend', async () => {
      // Create wheel with specific slot order to test index calculation
      const orderedWheel = {
        ...mockWheel,
        slots: [
          { id: 'slot-c', label: 'Prize C', weight: 25, isWinning: true, position: 2 },
          { id: 'slot-a', label: 'Prize A', weight: 25, isWinning: true, position: 0 },
          { id: 'slot-b', label: 'Prize B', weight: 25, isWinning: true, position: 1 },
        ]
      };

      mockPrisma.wheel.findUnique.mockResolvedValue(orderedWheel);
      mockPrisma.play.create.mockResolvedValue({
        id: 'play-1',
        result: 'WIN',
        pin: 'TEST123'
      } as any);

      // Mock slot selection to always pick slot-c
      const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0); // First slot in array

      const result = await spinWheel({
        wheelId: 'wheel-1',
        userAgent: 'test-agent',
        ip: '192.168.1.1'
      });

      // After stable sorting, slot-a(pos:0) slot-b(pos:1) slot-c(pos:2)
      // So slot-c should be at index 2
      expect(result.prizeIndex).toBe(2);
      expect(result.slot.id).toBe('slot-c');

      mathSpy.mockRestore();
    });

    it('should log activity after successful spin', async () => {
      mockPrisma.wheel.findUnique.mockResolvedValue(mockWheel);
      mockPrisma.play.create.mockResolvedValue({
        id: 'play-1',
        result: 'WIN',
        pin: 'TEST123'
      } as any);

      await spinWheel({
        wheelId: 'wheel-1',
        userAgent: 'test-agent',
        ip: '192.168.1.1'
      });

      expect(mockLogPlayActivity).toHaveBeenCalledWith({
        playId: 'play-1',
        wheelId: 'wheel-1',
        companyId: 'company-1',
        result: 'WIN',
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent'
      });
    });

    it('should handle losing play correctly', async () => {
      const losingWheel = {
        ...mockWheel,
        mode: 'RANDOM_WIN',
        slots: [
          { id: 'slot-1', label: 'No Prize', weight: 100, isWinning: false, position: 0 }
        ]
      };

      mockPrisma.wheel.findUnique.mockResolvedValue(losingWheel);
      mockPrisma.play.create.mockResolvedValue({
        id: 'play-1',
        result: 'LOSE',
        pin: null
      } as any);

      const result = await spinWheel({
        wheelId: 'wheel-1',
        userAgent: 'test-agent',
        ip: '192.168.1.1'
      });

      expect(result.play.result).toBe('LOSE');
      expect(result.play.prize).toBeUndefined();
      expect(mockGeneratePIN).not.toHaveBeenCalled();
      expect(mockGenerateQRCode).not.toHaveBeenCalled();
    });
  });
});