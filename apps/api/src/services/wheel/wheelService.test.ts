import { describe, it, expect, beforeEach, vi } from 'vitest';
import { findWheelById, getPublicWheelData } from './wheelService';
import prisma from '../../utils/db';
import { formatWheelResponse } from '../../utils/slot-utils';

// Mock dependencies
vi.mock('../../utils/db');
vi.mock('../../utils/slot-utils');

const mockPrisma = vi.mocked(prisma);
const mockFormatWheelResponse = vi.mocked(formatWheelResponse);

describe('Wheel Service', () => {
  const mockWheelData = {
    id: 'wheel-1',
    name: 'Test Wheel',
    formSchema: { fields: [] },
    socialNetwork: 'instagram',
    redirectUrl: 'https://instagram.com/test',
    redirectText: 'Follow us!',
    playLimit: 'ONCE_PER_DAY',
    gameRules: 'Spin to win!',
    footerText: 'Good luck!',
    mainTitle: 'Win Big!',
    bannerImage: 'https://example.com/banner.jpg',
    backgroundImage: 'https://example.com/bg.jpg',
    company: {
      id: 'company-1',
      isActive: true
    },
    slots: [
      {
        id: 'slot-1',
        label: 'Prize A',
        color: '#FF0000',
        weight: 25,
        isWinning: true,
        position: 0
      },
      {
        id: 'slot-2',
        label: 'Prize B',
        color: '#00FF00',
        weight: 25,
        isWinning: true,
        position: 1
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.wheel.findUnique = vi.fn();
  });

  describe('findWheelById', () => {
    it('should find wheel by ID without company validation', async () => {
      mockPrisma.wheel.findUnique.mockResolvedValue(mockWheelData as any);

      const result = await findWheelById({ wheelId: 'wheel-1' });

      expect(result).toEqual(mockWheelData);
      expect(mockPrisma.wheel.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'wheel-1',
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
    });

    it('should find wheel by ID with company validation', async () => {
      mockPrisma.wheel.findUnique.mockResolvedValue(mockWheelData as any);

      const result = await findWheelById({
        wheelId: 'wheel-1',
        companyId: 'company-1'
      });

      expect(result).toEqual(mockWheelData);
      expect(mockPrisma.wheel.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'wheel-1',
          isActive: true,
          company: {
            id: 'company-1',
            isActive: true
          }
        },
        include: {
          company: true,
          slots: {
            where: { isActive: true },
            orderBy: { position: 'asc' }
          }
        }
      });
    });

    it('should ignore special company ID values', async () => {
      const specialValues = ['company', 'undefined', 'null'];

      for (const companyId of specialValues) {
        mockPrisma.wheel.findUnique.mockClear();
        mockPrisma.wheel.findUnique.mockResolvedValue(mockWheelData as any);

        await findWheelById({ wheelId: 'wheel-1', companyId });

        expect(mockPrisma.wheel.findUnique).toHaveBeenCalledWith({
          where: {
            id: 'wheel-1',
            isActive: true
            // No company filter for special values
          },
          include: {
            company: true,
            slots: {
              where: { isActive: true },
              orderBy: { position: 'asc' }
            }
          }
        });
      }
    });

    it('should return null when wheel not found', async () => {
      mockPrisma.wheel.findUnique.mockResolvedValue(null);

      const result = await findWheelById({ wheelId: 'nonexistent' });

      expect(result).toBeNull();
    });

    it('should return null when company is inactive', async () => {
      const inactiveCompanyWheel = {
        ...mockWheelData,
        company: {
          id: 'company-1',
          isActive: false
        }
      };

      mockPrisma.wheel.findUnique.mockResolvedValue(inactiveCompanyWheel as any);

      const result = await findWheelById({ wheelId: 'wheel-1' });

      expect(result).toBeNull();
    });

    it('should return null when company is missing', async () => {
      const noCompanyWheel = {
        ...mockWheelData,
        company: null
      };

      mockPrisma.wheel.findUnique.mockResolvedValue(noCompanyWheel as any);

      const result = await findWheelById({ wheelId: 'wheel-1' });

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.wheel.findUnique.mockRejectedValue(dbError);

      await expect(findWheelById({ wheelId: 'wheel-1' })).rejects.toThrow('Database connection failed');
    });
  });

  describe('getPublicWheelData', () => {
    beforeEach(() => {
      mockFormatWheelResponse.mockReturnValue({
        wheel: {
          id: 'wheel-1',
          name: 'Test Wheel',
          formSchema: { fields: [] },
          socialNetwork: 'instagram',
          redirectUrl: 'https://instagram.com/test',
          redirectText: 'Follow us!',
          playLimit: 'ONCE_PER_DAY',
          gameRules: 'Spin to win!',
          footerText: 'Good luck!',
          mainTitle: 'Win Big!',
          bannerImage: 'https://example.com/banner.jpg',
          backgroundImage: 'https://example.com/bg.jpg',
          slots: [
            {
              id: 'slot-1',
              label: 'Prize A',
              color: '#FF0000',
              weight: 25,
              isWinning: true,
              position: 0
            },
            {
              id: 'slot-2',
              label: 'Prize B',
              color: '#00FF00',
              weight: 25,
              isWinning: true,
              position: 1
            }
          ]
        }
      });
    });

    it('should return formatted wheel data', async () => {
      mockPrisma.wheel.findUnique.mockResolvedValue(mockWheelData as any);

      const result = await getPublicWheelData({
        wheelId: 'wheel-1',
        companyId: 'company-1'
      });

      expect(result).toEqual({
        wheel: expect.objectContaining({
          id: 'wheel-1',
          name: 'Test Wheel',
          slots: expect.arrayContaining([
            expect.objectContaining({
              id: 'slot-1',
              label: 'Prize A'
            })
          ])
        })
      });

      expect(mockFormatWheelResponse).toHaveBeenCalledWith(mockWheelData);
    });

    it('should handle special company ID "company"', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockPrisma.wheel.findUnique.mockResolvedValue(mockWheelData as any);

      await getPublicWheelData({
        wheelId: 'wheel-1',
        companyId: 'company'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Special case: companyId is \'company\'')
      );

      consoleSpy.mockRestore();
    });

    it('should return null when wheel not found', async () => {
      mockPrisma.wheel.findUnique.mockResolvedValue(null);

      const result = await getPublicWheelData({
        wheelId: 'nonexistent'
      });

      expect(result).toBeNull();
      expect(mockFormatWheelResponse).not.toHaveBeenCalled();
    });

    it('should pass through all wheel properties to formatter', async () => {
      const fullWheelData = {
        ...mockWheelData,
        customProperty: 'test value'
      };

      mockPrisma.wheel.findUnique.mockResolvedValue(fullWheelData as any);

      await getPublicWheelData({ wheelId: 'wheel-1' });

      expect(mockFormatWheelResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'wheel-1',
          name: 'Test Wheel',
          customProperty: 'test value'
        })
      );
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with real-like data', async () => {
      const complexWheelData = {
        id: 'complex-wheel',
        name: 'Complex Test Wheel',
        formSchema: {
          fields: [
            { name: 'email', type: 'email', required: true },
            { name: 'phone', type: 'tel', required: false }
          ]
        },
        socialNetwork: 'facebook',
        redirectUrl: 'https://facebook.com/testpage',
        redirectText: 'Like our page for more chances to win!',
        playLimit: 'ONCE_PER_MONTH',
        gameRules: 'Spin once per month to win amazing prizes!',
        footerText: 'Terms and conditions apply.',
        mainTitle: 'Monthly Prize Wheel',
        bannerImage: 'https://cdn.example.com/banner.jpg',
        backgroundImage: 'https://cdn.example.com/background.jpg',
        company: {
          id: 'company-complex',
          isActive: true
        },
        slots: [
          { id: 'uuid-1', label: '10% Discount', color: '#FF5733', weight: 30, isWinning: true, position: 0 },
          { id: 'uuid-2', label: 'Free Shipping', color: '#33FF57', weight: 25, isWinning: true, position: 1 },
          { id: 'uuid-3', label: 'Try Again', color: '#3357FF', weight: 20, isWinning: false, position: 2 },
          { id: 'uuid-4', label: '50% Off', color: '#FF33F1', weight: 15, isWinning: true, position: 3 },
          { id: 'uuid-5', label: 'Free Product', color: '#F1FF33', weight: 10, isWinning: true, position: 4 }
        ]
      };

      mockPrisma.wheel.findUnique.mockResolvedValue(complexWheelData as any);
      mockFormatWheelResponse.mockReturnValue({
        wheel: {
          id: complexWheelData.id,
          name: complexWheelData.name,
          formSchema: complexWheelData.formSchema,
          socialNetwork: complexWheelData.socialNetwork,
          redirectUrl: complexWheelData.redirectUrl,
          redirectText: complexWheelData.redirectText,
          playLimit: complexWheelData.playLimit,
          gameRules: complexWheelData.gameRules,
          footerText: complexWheelData.footerText,
          mainTitle: complexWheelData.mainTitle,
          bannerImage: complexWheelData.bannerImage,
          backgroundImage: complexWheelData.backgroundImage,
          slots: complexWheelData.slots
        }
      });

      const result = await getPublicWheelData({
        wheelId: 'complex-wheel',
        companyId: 'company-complex'
      });

      // Verify all properties are preserved
      expect(result?.wheel).toEqual(expect.objectContaining({
        id: 'complex-wheel',
        name: 'Complex Test Wheel',
        formSchema: expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({ name: 'email', type: 'email' })
          ])
        }),
        socialNetwork: 'facebook',
        playLimit: 'ONCE_PER_MONTH',
        slots: expect.arrayContaining([
          expect.objectContaining({ label: '10% Discount', weight: 30 }),
          expect.objectContaining({ label: 'Free Product', weight: 10 })
        ])
      }));

      // Verify the database was queried with correct parameters
      expect(mockPrisma.wheel.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'complex-wheel',
          isActive: true,
          company: {
            id: 'company-complex',
            isActive: true
          }
        },
        include: {
          company: true,
          slots: {
            where: { isActive: true },
            orderBy: { position: 'asc' }
          }
        }
      });
    });
  });
});