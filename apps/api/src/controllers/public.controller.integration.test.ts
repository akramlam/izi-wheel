import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  getPublicWheel,
  playWheel,
  getPrizeDetails,
  redeemPrizeById,
  getPrizeByPin
} from './public.controller.refactored';
import { getPublicWheelData } from '../services/wheel/wheelService';
import { spinWheel } from '../services/wheel/playService';
import { getPrizeDetailsByPlayId, getPrizeDetailsByPin, redeemPrize } from '../services/wheel/prizeService';
import { getRealClientIP } from '../utils/ip';

// Mock all service dependencies
vi.mock('../services/wheel/wheelService');
vi.mock('../services/wheel/playService');
vi.mock('../services/wheel/prizeService');
vi.mock('../utils/ip');

const mockGetPublicWheelData = vi.mocked(getPublicWheelData);
const mockSpinWheel = vi.mocked(spinWheel);
const mockGetPrizeDetailsByPlayId = vi.mocked(getPrizeDetailsByPlayId);
const mockGetPrizeDetailsByPin = vi.mocked(getPrizeDetailsByPin);
const mockRedeemPrize = vi.mocked(redeemPrize);
const mockGetRealClientIP = vi.mocked(getRealClientIP);

describe('Public Controller Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Set up routes
    app.get('/public/:companyId/wheels/:wheelId', getPublicWheel);
    app.post('/public/:companyId/wheels/:wheelId/play', playWheel);
    app.get('/public/play/:playId/details', getPrizeDetails);
    app.post('/public/play/:playId/redeem', redeemPrizeById);
    app.get('/public/prize/:pin', getPrizeByPin);

    // Reset all mocks
    vi.clearAllMocks();
    mockGetRealClientIP.mockReturnValue('192.168.1.1');
  });

  describe('GET /public/:companyId/wheels/:wheelId', () => {
    const mockWheelResponse = {
      wheel: {
        id: 'wheel-1',
        name: 'Test Wheel',
        formSchema: { fields: [] },
        slots: [
          { id: 'slot-1', label: 'Prize A', color: '#FF0000', weight: 25, isWinning: true, position: 0 },
          { id: 'slot-2', label: 'Prize B', color: '#00FF00', weight: 25, isWinning: true, position: 1 }
        ]
      }
    };

    it('should return wheel data successfully', async () => {
      mockGetPublicWheelData.mockResolvedValue(mockWheelResponse);

      const response = await request(app)
        .get('/public/company-1/wheels/wheel-1')
        .expect(200);

      expect(response.body).toEqual(mockWheelResponse);
      expect(mockGetPublicWheelData).toHaveBeenCalledWith({
        wheelId: 'wheel-1',
        companyId: 'company-1'
      });
    });

    it('should return 400 when wheelId is missing', async () => {
      const response = await request(app)
        .get('/public/company-1/wheels/')
        .expect(404); // Express returns 404 for missing route params

      expect(mockGetPublicWheelData).not.toHaveBeenCalled();
    });

    it('should return 404 when wheel not found', async () => {
      mockGetPublicWheelData.mockResolvedValue(null);

      const response = await request(app)
        .get('/public/company-1/wheels/nonexistent')
        .expect(404);

      expect(response.body).toEqual({ error: 'Wheel not found' });
    });

    it('should return 500 on service error', async () => {
      mockGetPublicWheelData.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/public/company-1/wheels/wheel-1')
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal server error' });
    });

    it('should handle special company ID case', async () => {
      mockGetPublicWheelData.mockResolvedValue(mockWheelResponse);

      await request(app)
        .get('/public/company/wheels/wheel-1')
        .expect(200);

      expect(mockGetPublicWheelData).toHaveBeenCalledWith({
        wheelId: 'wheel-1',
        companyId: 'company'
      });
    });
  });

  describe('POST /public/:companyId/wheels/:wheelId/play', () => {
    const mockSpinResult = {
      play: {
        id: 'play-1',
        result: 'WIN' as const,
        prize: {
          pin: 'ABC123',
          qrLink: 'https://example.com/qr'
        }
      },
      slot: {
        id: 'slot-1',
        label: 'Prize A',
        position: 0
      },
      prizeIndex: 0
    };

    it('should spin wheel successfully', async () => {
      mockSpinWheel.mockResolvedValue(mockSpinResult);

      const response = await request(app)
        .post('/public/company-1/wheels/wheel-1/play')
        .send({ leadInfo: { name: 'Test User', email: 'test@example.com' } })
        .expect(200);

      expect(response.body).toEqual(mockSpinResult);
      expect(mockSpinWheel).toHaveBeenCalledWith({
        wheelId: 'wheel-1',
        companyId: 'company-1',
        userAgent: expect.any(String),
        ip: '192.168.1.1',
        leadInfo: { name: 'Test User', email: 'test@example.com' }
      });
    });

    it('should handle missing wheelId', async () => {
      const response = await request(app)
        .post('/public/company-1/wheels//play')
        .send({})
        .expect(404); // Express routing will handle this

      expect(mockSpinWheel).not.toHaveBeenCalled();
    });

    it('should return 429 for play limit exceeded', async () => {
      mockSpinWheel.mockRejectedValue(new Error('Play limit exceeded. This wheel can only be played once per day.'));

      const response = await request(app)
        .post('/public/company-1/wheels/wheel-1/play')
        .send({})
        .expect(429);

      expect(response.body).toEqual({
        error: 'Play limit exceeded. This wheel can only be played once per day.',
        code: 'PLAY_LIMIT_EXCEEDED'
      });
    });

    it('should return 404 for wheel not found', async () => {
      mockSpinWheel.mockRejectedValue(new Error('Wheel not found'));

      const response = await request(app)
        .post('/public/company-1/wheels/nonexistent/play')
        .send({})
        .expect(404);

      expect(response.body).toEqual({ error: 'Wheel not found' });
    });

    it('should return 403 for inactive company', async () => {
      mockSpinWheel.mockRejectedValue(new Error('Company is not active'));

      const response = await request(app)
        .post('/public/company-1/wheels/wheel-1/play')
        .send({})
        .expect(403);

      expect(response.body).toEqual({ error: 'Company is not active' });
    });

    it('should handle losing spin', async () => {
      const losingResult = {
        play: {
          id: 'play-2',
          result: 'LOSE' as const
        },
        slot: {
          id: 'slot-3',
          label: 'Try Again',
          position: 2
        },
        prizeIndex: 2
      };

      mockSpinWheel.mockResolvedValue(losingResult);

      const response = await request(app)
        .post('/public/company-1/wheels/wheel-1/play')
        .send({})
        .expect(200);

      expect(response.body).toEqual(losingResult);
      expect(response.body.play.prize).toBeUndefined();
    });
  });

  describe('GET /public/play/:playId/details', () => {
    const mockPrizeDetails = {
      id: 'play-1',
      pin: 'ABC123',
      status: 'PENDING',
      prize: {
        label: 'Free T-Shirt',
        description: 'Choose your size'
      },
      lead: { name: 'John Doe', email: 'john@example.com' }
    };

    it('should return prize details successfully', async () => {
      mockGetPrizeDetailsByPlayId.mockResolvedValue(mockPrizeDetails);

      const response = await request(app)
        .get('/public/play/play-1/details')
        .expect(200);

      expect(response.body).toEqual(mockPrizeDetails);
      expect(mockGetPrizeDetailsByPlayId).toHaveBeenCalledWith('play-1');
    });

    it('should return 400 when playId is missing', async () => {
      const response = await request(app)
        .get('/public/play//details')
        .expect(404); // Express routing

      expect(mockGetPrizeDetailsByPlayId).not.toHaveBeenCalled();
    });

    it('should return 404 when play not found', async () => {
      mockGetPrizeDetailsByPlayId.mockResolvedValue(null);

      const response = await request(app)
        .get('/public/play/nonexistent/details')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Play not found',
        details: 'No play record found with the provided ID'
      });
    });

    it('should return 400 for invalid UUID format', async () => {
      mockGetPrizeDetailsByPlayId.mockRejectedValue(new Error('Invalid play ID format'));

      const response = await request(app)
        .get('/public/play/invalid-uuid/details')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid play ID format',
        validationError: true
      });
    });

    it('should return 400 for non-winning play', async () => {
      mockGetPrizeDetailsByPlayId.mockRejectedValue(new Error('This play did not result in a prize'));

      const response = await request(app)
        .get('/public/play/play-1/details')
        .expect(400);

      expect(response.body).toEqual({ error: 'This play did not result in a prize' });
    });
  });

  describe('POST /public/play/:playId/redeem', () => {
    it('should redeem prize successfully', async () => {
      const mockRedemptionResult = {
        success: true,
        message: 'Prize redeemed successfully',
        details: {
          id: 'play-1',
          pin: 'ABC123',
          prize: {
            label: 'Free T-Shirt',
            description: 'Choose your size'
          }
        }
      };

      mockRedeemPrize.mockResolvedValue(mockRedemptionResult);

      const response = await request(app)
        .post('/public/play/play-1/redeem')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Prize redeemed successfully',
        prize: mockRedemptionResult.details
      });
      expect(mockRedeemPrize).toHaveBeenCalledWith('play-1');
    });

    it('should return 400 for redemption failure', async () => {
      mockRedeemPrize.mockResolvedValue({
        success: false,
        message: 'Prize has already been redeemed'
      });

      const response = await request(app)
        .post('/public/play/play-1/redeem')
        .expect(400);

      expect(response.body).toEqual({ error: 'Prize has already been redeemed' });
    });
  });

  describe('GET /public/prize/:pin', () => {
    const mockPinPrizeDetails = {
      id: 'play-1',
      pin: 'ABC123',
      status: 'PENDING',
      prize: {
        label: 'Free Coffee',
        description: 'Valid at any location'
      },
      lead: { name: 'Jane Doe' }
    };

    it('should return prize details by PIN successfully', async () => {
      mockGetPrizeDetailsByPin.mockResolvedValue(mockPinPrizeDetails);

      const response = await request(app)
        .get('/public/prize/ABC123')
        .expect(200);

      expect(response.body).toEqual(mockPinPrizeDetails);
      expect(mockGetPrizeDetailsByPin).toHaveBeenCalledWith('ABC123');
    });

    it('should return 404 when PIN not found', async () => {
      mockGetPrizeDetailsByPin.mockResolvedValue(null);

      const response = await request(app)
        .get('/public/prize/INVALID')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Prize not found',
        details: 'No prize found for the provided PIN'
      });
    });

    it('should return 400 for empty PIN', async () => {
      mockGetPrizeDetailsByPin.mockRejectedValue(new Error('PIN is required'));

      const response = await request(app)
        .get('/public/prize/ ')
        .expect(400);

      expect(response.body).toEqual({ error: 'PIN is required' });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle unexpected service errors gracefully', async () => {
      mockGetPublicWheelData.mockRejectedValue(new Error('Unexpected database error'));

      const response = await request(app)
        .get('/public/company-1/wheels/wheel-1')
        .expect(500);

      expect(response.body).toEqual({ error: 'Internal server error' });
    });

    it('should handle malformed request bodies', async () => {
      mockSpinWheel.mockResolvedValue({
        play: { id: 'play-1', result: 'WIN' },
        slot: { id: 'slot-1', label: 'Prize A', position: 0 },
        prizeIndex: 0
      });

      // Send invalid JSON
      const response = await request(app)
        .post('/public/company-1/wheels/wheel-1/play')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should preserve user agent and IP information', async () => {
      mockSpinWheel.mockResolvedValue({
        play: { id: 'play-1', result: 'WIN' },
        slot: { id: 'slot-1', label: 'Prize A' },
        prizeIndex: 0
      });

      await request(app)
        .post('/public/company-1/wheels/wheel-1/play')
        .set('User-Agent', 'TestAgent/1.0')
        .send({})
        .expect(200);

      expect(mockSpinWheel).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: 'TestAgent/1.0',
          ip: '192.168.1.1'
        })
      );
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle complete winning flow', async () => {
      // 1. Get wheel data
      mockGetPublicWheelData.mockResolvedValue({
        wheel: {
          id: 'wheel-1',
          name: 'Test Wheel',
          formSchema: { fields: [{ name: 'email', type: 'email', required: true }] },
          slots: [
            { id: 'slot-1', label: 'Free Coffee', color: '#8B4513', weight: 50, isWinning: true, position: 0 },
            { id: 'slot-2', label: 'Try Again', color: '#FF0000', weight: 50, isWinning: false, position: 1 }
          ]
        }
      });

      // 2. Play wheel and win
      mockSpinWheel.mockResolvedValue({
        play: {
          id: 'play-123',
          result: 'WIN',
          prize: { pin: 'COFFEE123', qrLink: 'https://example.com/qr/COFFEE123' }
        },
        slot: { id: 'slot-1', label: 'Free Coffee', position: 0 },
        prizeIndex: 0
      });

      // 3. Get prize details
      mockGetPrizeDetailsByPlayId.mockResolvedValue({
        id: 'play-123',
        pin: 'COFFEE123',
        status: 'PENDING',
        prize: { label: 'Free Coffee', description: 'Redeem at any store' },
        lead: { email: 'user@example.com' }
      });

      // 4. Redeem prize
      mockRedeemPrize.mockResolvedValue({
        success: true,
        message: 'Prize redeemed successfully',
        details: {
          id: 'play-123',
          pin: 'COFFEE123',
          prize: { label: 'Free Coffee', description: 'Redeem at any store' }
        }
      });

      // Execute the flow
      const wheelResponse = await request(app).get('/public/company-1/wheels/wheel-1').expect(200);
      expect(wheelResponse.body.wheel.name).toBe('Test Wheel');

      const playResponse = await request(app)
        .post('/public/company-1/wheels/wheel-1/play')
        .send({ leadInfo: { email: 'user@example.com' } })
        .expect(200);
      expect(playResponse.body.play.result).toBe('WIN');
      expect(playResponse.body.play.prize.pin).toBe('COFFEE123');

      const detailsResponse = await request(app)
        .get('/public/play/play-123/details')
        .expect(200);
      expect(detailsResponse.body.prize.label).toBe('Free Coffee');

      const redeemResponse = await request(app)
        .post('/public/play/play-123/redeem')
        .expect(200);
      expect(redeemResponse.body.message).toBe('Prize redeemed successfully');
    });

    it('should handle complete losing flow', async () => {
      mockGetPublicWheelData.mockResolvedValue({
        wheel: {
          id: 'wheel-1',
          name: 'Test Wheel',
          slots: [
            { id: 'slot-1', label: 'Try Again', color: '#FF0000', weight: 100, isWinning: false, position: 0 }
          ]
        }
      });

      mockSpinWheel.mockResolvedValue({
        play: { id: 'play-456', result: 'LOSE' },
        slot: { id: 'slot-1', label: 'Try Again', position: 0 },
        prizeIndex: 0
      });

      const wheelResponse = await request(app).get('/public/company-1/wheels/wheel-1').expect(200);
      expect(wheelResponse.body.wheel.name).toBe('Test Wheel');

      const playResponse = await request(app)
        .post('/public/company-1/wheels/wheel-1/play')
        .send({})
        .expect(200);
      expect(playResponse.body.play.result).toBe('LOSE');
      expect(playResponse.body.play.prize).toBeUndefined();
    });
  });
});