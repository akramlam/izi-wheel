import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import prisma from '../utils/db';
import { getPublicWheel, playWheel, getPrizeDetails, redeemPrizeById } from '../controllers/public.controller.refactored';

// Create test app with all middleware
const createTestApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.set('trust proxy', true);

  // Public routes
  app.get('/public/:companyId/wheels/:wheelId', getPublicWheel);
  app.post('/public/:companyId/wheels/:wheelId/play', playWheel);
  app.get('/public/play/:playId/details', getPrizeDetails);
  app.post('/public/play/:playId/redeem', redeemPrizeById);

  return app;
};

describe('End-to-End Wheel Flow Tests', () => {
  let app: express.Application;
  let testCompany: any;
  let testWheel: any;

  beforeAll(async () => {
    app = createTestApp();

    // Clean up any existing test data
    await prisma.play.deleteMany({ where: { wheel: { name: { startsWith: 'E2E Test' } } } });
    await prisma.slot.deleteMany({ where: { wheel: { name: { startsWith: 'E2E Test' } } } });
    await prisma.wheel.deleteMany({ where: { name: { startsWith: 'E2E Test' } } });
    await prisma.company.deleteMany({ where: { name: { startsWith: 'E2E Test' } } });
  });

  beforeEach(async () => {
    // Create test company
    testCompany = await prisma.company.create({
      data: {
        id: `e2e-company-${Date.now()}`,
        name: 'E2E Test Company',
        plan: 'PREMIUM',
        email: 'test@e2e.com',
        isActive: true
      }
    });

    // Create test wheel with slots
    testWheel = await prisma.wheel.create({
      data: {
        id: `e2e-wheel-${Date.now()}`,
        name: 'E2E Test Wheel',
        companyId: testCompany.id,
        mode: 'ALL_WIN',
        playLimit: 'UNLIMITED',
        formSchema: {
          fields: [
            { name: 'email', type: 'email', label: 'Email', required: true },
            { name: 'name', type: 'text', label: 'Name', required: false }
          ]
        },
        mainTitle: 'Win Amazing E2E Prizes!',
        gameRules: 'Spin to win one of our great prizes!',
        isActive: true,
        slots: {
          create: [
            {
              id: `slot-1-${Date.now()}`,
              label: 'Free Coffee',
              color: '#8B4513',
              weight: 25,
              isWinning: true,
              position: 0,
              isActive: true
            },
            {
              id: `slot-2-${Date.now()}`,
              label: '10% Discount',
              color: '#32CD32',
              weight: 25,
              isWinning: true,
              position: 1,
              isActive: true
            },
            {
              id: `slot-3-${Date.now()}`,
              label: 'Free Shipping',
              color: '#4169E1',
              weight: 25,
              isWinning: true,
              position: 2,
              isActive: true
            },
            {
              id: `slot-4-${Date.now()}`,
              label: '20% Off',
              color: '#FF6347',
              weight: 25,
              isWinning: true,
              position: 3,
              isActive: true
            }
          ]
        }
      },
      include: {
        slots: true
      }
    });
  });

  afterAll(async () => {
    // Clean up all test data
    await prisma.play.deleteMany({ where: { wheel: { name: { startsWith: 'E2E Test' } } } });
    await prisma.slot.deleteMany({ where: { wheel: { name: { startsWith: 'E2E Test' } } } });
    await prisma.wheel.deleteMany({ where: { name: { startsWith: 'E2E Test' } } });
    await prisma.company.deleteMany({ where: { name: { startsWith: 'E2E Test' } } });
    await prisma.$disconnect();
  });

  describe('Complete Winning Flow', () => {
    it('should complete entire winning flow: get wheel -> play -> win -> get details -> redeem', async () => {
      // Step 1: Get wheel data
      const wheelResponse = await request(app)
        .get(`/public/${testCompany.id}/wheels/${testWheel.id}`)
        .expect(200);

      expect(wheelResponse.body.wheel).toMatchObject({
        id: testWheel.id,
        name: 'E2E Test Wheel',
        mainTitle: 'Win Amazing E2E Prizes!',
        slots: expect.arrayContaining([
          expect.objectContaining({
            label: 'Free Coffee',
            isWinning: true,
            position: 0
          }),
          expect.objectContaining({
            label: '10% Discount',
            isWinning: true,
            position: 1
          })
        ])
      });

      expect(wheelResponse.body.wheel.slots).toHaveLength(4);

      // Step 2: Play the wheel
      const playResponse = await request(app)
        .post(`/public/${testCompany.id}/wheels/${testWheel.id}/play`)
        .send({
          leadInfo: {
            email: 'player@example.com',
            name: 'John Player'
          }
        })
        .set('User-Agent', 'E2E-Test-Agent/1.0')
        .expect(200);

      expect(playResponse.body).toMatchObject({
        play: {
          id: expect.any(String),
          result: 'WIN', // Should always win in ALL_WIN mode
          prize: {
            pin: expect.any(String),
            qrLink: expect.any(String)
          }
        },
        slot: {
          id: expect.any(String),
          label: expect.any(String),
          position: expect.any(Number)
        },
        prizeIndex: expect.any(Number)
      });

      const { play, slot, prizeIndex } = playResponse.body;

      // Verify prize index matches slot position in sorted order
      const sortedSlots = wheelResponse.body.wheel.slots.sort((a: any, b: any) => {
        const posA = a.position ?? 999;
        const posB = b.position ?? 999;
        if (posA !== posB) return posA - posB;
        return a.id.localeCompare(b.id);
      });

      expect(prizeIndex).toBe(sortedSlots.findIndex((s: any) => s.id === slot.id));

      // Step 3: Get prize details
      const detailsResponse = await request(app)
        .get(`/public/play/${play.id}/details`)
        .expect(200);

      expect(detailsResponse.body).toMatchObject({
        id: play.id,
        pin: play.prize.pin,
        status: 'PENDING',
        prize: {
          label: slot.label,
          description: expect.any(String)
        },
        lead: {
          email: 'player@example.com',
          name: 'John Player'
        }
      });

      // Step 4: Redeem the prize
      const redeemResponse = await request(app)
        .post(`/public/play/${play.id}/redeem`)
        .expect(200);

      expect(redeemResponse.body).toMatchObject({
        message: 'Prize redeemed successfully',
        prize: {
          id: play.id,
          pin: play.prize.pin,
          prize: {
            label: slot.label
          }
        }
      });

      // Step 5: Verify redemption status changed
      const finalDetailsResponse = await request(app)
        .get(`/public/play/${play.id}/details`)
        .expect(200);

      expect(finalDetailsResponse.body.status).toBe('REDEEMED');

      // Step 6: Try to redeem again (should fail)
      const doubleRedeemResponse = await request(app)
        .post(`/public/play/${play.id}/redeem`)
        .expect(400);

      expect(doubleRedeemResponse.body.error).toContain('already been redeemed');
    });
  });

  describe('Prize Resolution Accuracy', () => {
    it('should correctly resolve prize position across backend and frontend', async () => {
      // Create wheel with specific slot ordering to test resolution
      const complexWheel = await prisma.wheel.create({
        data: {
          id: `complex-wheel-${Date.now()}`,
          name: 'E2E Complex Test Wheel',
          companyId: testCompany.id,
          mode: 'ALL_WIN',
          playLimit: 'UNLIMITED',
          isActive: true,
          slots: {
            create: [
              // Create slots in different order to test stable sorting
              {
                id: `complex-slot-c-${Date.now()}`,
                label: 'Prize C',
                color: '#FF0000',
                weight: 25,
                isWinning: true,
                position: 2,
                isActive: true
              },
              {
                id: `complex-slot-a-${Date.now()}`,
                label: 'Prize A',
                color: '#00FF00',
                weight: 25,
                isWinning: true,
                position: 0,
                isActive: true
              },
              {
                id: `complex-slot-d-${Date.now()}`,
                label: 'Prize D',
                color: '#0000FF',
                weight: 25,
                isWinning: true,
                position: null, // Should be sorted last
                isActive: true
              },
              {
                id: `complex-slot-b-${Date.now()}`,
                label: 'Prize B',
                color: '#FFFF00',
                weight: 25,
                isWinning: true,
                position: 1,
                isActive: true
              }
            ]
          }
        },
        include: { slots: true }
      });

      // Get wheel data and verify slots are properly sorted
      const wheelResponse = await request(app)
        .get(`/public/${testCompany.id}/wheels/${complexWheel.id}`)
        .expect(200);

      const slots = wheelResponse.body.wheel.slots;
      expect(slots.map((s: any) => s.label)).toEqual(['Prize A', 'Prize B', 'Prize C', 'Prize D']);

      // Play multiple times and verify prize indices are correct
      for (let i = 0; i < 10; i++) {
        const playResponse = await request(app)
          .post(`/public/${testCompany.id}/wheels/${complexWheel.id}/play`)
          .send({ leadInfo: { email: `test${i}@example.com` } })
          .expect(200);

        const { slot, prizeIndex } = playResponse.body;

        // Find the slot in the sorted array
        const expectedIndex = slots.findIndex((s: any) => s.id === slot.id);
        expect(prizeIndex).toBe(expectedIndex);

        // Verify the prize index points to the correct slot
        expect(slots[prizeIndex].id).toBe(slot.id);
        expect(slots[prizeIndex].label).toBe(slot.label);
      }
    });

    it('should handle edge cases in prize resolution', async () => {
      // Create wheel with duplicate positions to test tiebreaking
      const edgeWheel = await prisma.wheel.create({
        data: {
          id: `edge-wheel-${Date.now()}`,
          name: 'E2E Edge Case Wheel',
          companyId: testCompany.id,
          mode: 'ALL_WIN',
          isActive: true,
          slots: {
            create: [
              {
                id: `edge-slot-z-${Date.now()}`, // Should come last when position is same
                label: 'Prize Z',
                color: '#FF0000',
                weight: 50,
                isWinning: true,
                position: 1,
                isActive: true
              },
              {
                id: `edge-slot-a-${Date.now()}`, // Should come first when position is same
                label: 'Prize A',
                color: '#00FF00',
                weight: 50,
                isWinning: true,
                position: 1,
                isActive: true
              }
            ]
          }
        }
      });

      const wheelResponse = await request(app)
        .get(`/public/${testCompany.id}/wheels/${edgeWheel.id}`)
        .expect(200);

      // Slots should be sorted by ID when positions are equal
      const slots = wheelResponse.body.wheel.slots;
      expect(slots.map((s: any) => s.label)).toEqual(['Prize A', 'Prize Z']);

      const playResponse = await request(app)
        .post(`/public/${testCompany.id}/wheels/${edgeWheel.id}/play`)
        .send({})
        .expect(200);

      const { prizeIndex, slot } = playResponse.body;
      expect([0, 1]).toContain(prizeIndex);
      expect(slots[prizeIndex].id).toBe(slot.id);
    });
  });

  describe('Play Limits and Rate Limiting', () => {
    it('should enforce daily play limits', async () => {
      // Create wheel with daily limit
      const limitedWheel = await prisma.wheel.create({
        data: {
          id: `limited-wheel-${Date.now()}`,
          name: 'E2E Limited Test Wheel',
          companyId: testCompany.id,
          mode: 'ALL_WIN',
          playLimit: 'ONCE_PER_DAY',
          isActive: true,
          slots: {
            create: [{
              id: `limited-slot-${Date.now()}`,
              label: 'Daily Prize',
              color: '#FF0000',
              weight: 100,
              isWinning: true,
              position: 0,
              isActive: true
            }]
          }
        }
      });

      // First play should succeed
      const firstPlay = await request(app)
        .post(`/public/${testCompany.id}/wheels/${limitedWheel.id}/play`)
        .send({ leadInfo: { email: 'limited@example.com' } })
        .set('X-Forwarded-For', '192.168.1.100')
        .expect(200);

      expect(firstPlay.body.play.result).toBe('WIN');

      // Second play from same IP should fail
      const secondPlay = await request(app)
        .post(`/public/${testCompany.id}/wheels/${limitedWheel.id}/play`)
        .send({ leadInfo: { email: 'limited@example.com' } })
        .set('X-Forwarded-For', '192.168.1.100')
        .expect(429);

      expect(secondPlay.body.error).toContain('once per day');
      expect(secondPlay.body.code).toBe('PLAY_LIMIT_EXCEEDED');

      // Play from different IP should succeed
      const differentIpPlay = await request(app)
        .post(`/public/${testCompany.id}/wheels/${limitedWheel.id}/play`)
        .send({ leadInfo: { email: 'different@example.com' } })
        .set('X-Forwarded-For', '192.168.1.200')
        .expect(200);

      expect(differentIpPlay.body.play.result).toBe('WIN');
    });
  });

  describe('RANDOM_WIN Mode Testing', () => {
    it('should respect probability in RANDOM_WIN mode', async () => {
      // Create wheel with mixed winning/losing slots
      const randomWheel = await prisma.wheel.create({
        data: {
          id: `random-wheel-${Date.now()}`,
          name: 'E2E Random Test Wheel',
          companyId: testCompany.id,
          mode: 'RANDOM_WIN',
          isActive: true,
          slots: {
            create: [
              {
                id: `random-win-${Date.now()}`,
                label: 'Big Prize',
                color: '#FFD700',
                weight: 10, // 10% chance
                isWinning: true,
                position: 0,
                isActive: true
              },
              {
                id: `random-lose-${Date.now()}`,
                label: 'Try Again',
                color: '#808080',
                weight: 90, // 90% chance
                isWinning: false,
                position: 1,
                isActive: true
              }
            ]
          }
        }
      });

      let wins = 0;
      let losses = 0;
      const totalPlays = 50;

      // Play multiple times and track results
      for (let i = 0; i < totalPlays; i++) {
        const playResponse = await request(app)
          .post(`/public/${testCompany.id}/wheels/${randomWheel.id}/play`)
          .send({ leadInfo: { email: `random${i}@example.com` } })
          .set('X-Forwarded-For', `192.168.1.${i}`)
          .expect(200);

        if (playResponse.body.play.result === 'WIN') {
          wins++;
          expect(playResponse.body.slot.label).toBe('Big Prize');
          expect(playResponse.body.play.prize).toBeDefined();
        } else {
          losses++;
          expect(playResponse.body.slot.label).toBe('Try Again');
          expect(playResponse.body.play.prize).toBeUndefined();
        }
      }

      // With 10% win rate, we should have some wins and mostly losses
      // Allow for statistical variance
      expect(wins).toBeGreaterThan(0);
      expect(wins).toBeLessThan(totalPlays * 0.3); // Should be well under 30%
      expect(losses).toBeGreaterThan(totalPlays * 0.7); // Should be well over 70%

      console.log(`RANDOM_WIN test: ${wins} wins, ${losses} losses out of ${totalPlays} plays`);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle nonexistent wheel gracefully', async () => {
      const response = await request(app)
        .get(`/public/${testCompany.id}/wheels/nonexistent-wheel`)
        .expect(404);

      expect(response.body.error).toBe('Wheel not found');
    });

    it('should handle inactive company gracefully', async () => {
      // Deactivate company
      await prisma.company.update({
        where: { id: testCompany.id },
        data: { isActive: false }
      });

      const response = await request(app)
        .post(`/public/${testCompany.id}/wheels/${testWheel.id}/play`)
        .send({})
        .expect(403);

      expect(response.body.error).toBe('Company is not active');

      // Reactivate for cleanup
      await prisma.company.update({
        where: { id: testCompany.id },
        data: { isActive: true }
      });
    });

    it('should handle wheel with no active slots', async () => {
      // Deactivate all slots
      await prisma.slot.updateMany({
        where: { wheelId: testWheel.id },
        data: { isActive: false }
      });

      const response = await request(app)
        .post(`/public/${testCompany.id}/wheels/${testWheel.id}/play`)
        .send({})
        .expect(500);

      expect(response.body.error).toBe('Internal server error');

      // Reactivate slots for cleanup
      await prisma.slot.updateMany({
        where: { wheelId: testWheel.id },
        data: { isActive: true }
      });
    });

    it('should handle invalid UUID formats', async () => {
      const response = await request(app)
        .get('/public/play/invalid-uuid-format/details')
        .expect(400);

      expect(response.body.error).toContain('Invalid play ID format');
    });
  });

  describe('Data Consistency Verification', () => {
    it('should maintain data consistency across the entire flow', async () => {
      const playResponse = await request(app)
        .post(`/public/${testCompany.id}/wheels/${testWheel.id}/play`)
        .send({
          leadInfo: {
            email: 'consistency@test.com',
            name: 'Consistency Tester',
            phone: '+1234567890'
          }
        })
        .expect(200);

      const playId = playResponse.body.play.id;

      // Verify database record matches API response
      const dbPlay = await prisma.play.findUnique({
        where: { id: playId },
        include: { slot: true }
      });

      expect(dbPlay).not.toBeNull();
      expect(dbPlay!.result).toBe(playResponse.body.play.result);
      expect(dbPlay!.pin).toBe(playResponse.body.play.prize?.pin);
      expect(dbPlay!.slot.id).toBe(playResponse.body.slot.id);
      expect(dbPlay!.slot.label).toBe(playResponse.body.slot.label);

      // Verify lead info is stored correctly
      expect(dbPlay!.leadInfo).toEqual({
        email: 'consistency@test.com',
        name: 'Consistency Tester',
        phone: '+1234567890'
      });

      // Verify redemption flow maintains consistency
      await request(app)
        .post(`/public/play/${playId}/redeem`)
        .expect(200);

      const dbPlayAfterRedeem = await prisma.play.findUnique({
        where: { id: playId }
      });

      expect(dbPlayAfterRedeem!.redemptionStatus).toBe('REDEEMED');
      expect(dbPlayAfterRedeem!.redeemedAt).not.toBeNull();
    });
  });
});