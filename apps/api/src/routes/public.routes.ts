import { Router } from 'express';
import {
  getPublicWheel,
  spinWheel,
  claimPrize,
  redeemPrize,
  getPlayDetails
} from '../controllers/public.controller';
import rateLimit from 'express-rate-limit';

const router = Router();

/**
 * Rate limiter for spin endpoint (prevent spam)
 * 10 requests per minute per IP
 */
const spinRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many spin requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for redemption endpoint (prevent PIN brute force)
 * 5 attempts per hour per IP
 */
const redeemRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many redemption attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Only count failed attempts
});

// ===== Public Wheel Routes =====

/**
 * GET /api/public/wheels/:wheelId
 * Get public wheel configuration
 */
router.get('/wheels/:wheelId', getPublicWheel);

/**
 * POST /api/public/wheels/:wheelId/spin
 * Spin the wheel and get result
 */
router.post('/wheels/:wheelId/spin', spinRateLimiter, spinWheel);

// ===== Play/Prize Routes =====

/**
 * GET /api/public/plays/:playId
 * Get play details for redemption page
 */
router.get('/plays/:playId', getPlayDetails);

/**
 * POST /api/public/plays/:playId/claim
 * Claim a prize by submitting contact info
 */
router.post('/plays/:playId/claim', claimPrize);

/**
 * POST /api/public/plays/:playId/redeem
 * Redeem a prize with PIN (merchant validation)
 */
router.post('/plays/:playId/redeem', redeemRateLimiter, redeemPrize);

export default router;
