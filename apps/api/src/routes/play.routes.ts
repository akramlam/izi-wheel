import { Router } from 'express';
import * as playController from '../controllers/play.controller';
import { authMiddleware, roleGuard } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router: Router = Router({ mergeParams: true });

/**
 * @route   POST /wheels/:wheelId/play
 * @desc    Spin the wheel and create a play record
 * @access  Public
 */
router.post('/', playController.spinWheel);

/**
 * @route   PUT /plays/:playId/redeem
 * @desc    Redeem a prize
 * @access  Public
 */
router.put('/:playId/redeem', playController.redeemPrize);

/**
 * @route   GET /wheels/:wheelId/plays
 * @desc    Get play history for a wheel
 * @access  Private (ADMIN, SUPER)
 */
router.get('/history', authMiddleware, roleGuard([Role.ADMIN, Role.SUPER]), playController.getPlayHistory);

export default router; 