import { Router } from 'express';
import * as wheelController from '../controllers/wheel.controller';
import * as slotController from '../controllers/slot.controller';
import * as playController from '../controllers/play.controller';
import { authMiddleware, roleGuard, companyGuard } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';
import playRoutes from './play.routes';

// Add type annotation for router
const router: Router = Router({ mergeParams: true });

// Register public play routes first (these don't require authentication)
router.use('/:wheelId/play', playRoutes);

// Apply authentication middleware to all other wheel routes
router.use(authMiddleware);

// Apply company guard to ensure users can only access their company's resources
router.use(companyGuard);

// Wheel routes
/**
 * @route   GET /companies/:companyId/wheels
 * @desc    Get all wheels for a company
 * @access  Private (ADMIN, SUB, SUPER)
 */
router.get('/', wheelController.getWheels);

/**
 * @route   GET /companies/:companyId/wheels/:wheelId
 * @desc    Get a specific wheel with its slots
 * @access  Private (ADMIN, SUB, SUPER)
 */
router.get('/:wheelId', wheelController.getWheel);

/**
 * @route   POST /companies/:companyId/wheels
 * @desc    Create a new wheel
 * @access  Private (ADMIN, SUPER)
 */
router.post('/', roleGuard([Role.ADMIN, Role.SUPER]), wheelController.createWheel);

/**
 * @route   PUT /companies/:companyId/wheels/:wheelId
 * @desc    Update an existing wheel
 * @access  Private (ADMIN, SUPER)
 */
router.put('/:wheelId', roleGuard([Role.ADMIN, Role.SUPER]), wheelController.updateWheel);

/**
 * @route   DELETE /companies/:companyId/wheels/:wheelId
 * @desc    Delete a wheel
 * @access  Private (ADMIN, SUPER)
 */
router.delete('/:wheelId', roleGuard([Role.ADMIN, Role.SUPER]), wheelController.deleteWheel);

// Leads routes
/**
 * @route   GET /companies/:companyId/wheels/:wheelId/leads
 * @desc    Get all leads for a wheel (JSON format)
 * @access  Private (ADMIN, SUPER) - PREMIUM plan only
 */
router.get('/:wheelId/leads', roleGuard([Role.ADMIN, Role.SUPER]), playController.getWheelLeads);

/**
 * @route   GET /companies/:companyId/wheels/:wheelId/leads.csv
 * @desc    Get all leads for a wheel (CSV format)
 * @access  Private (ADMIN, SUPER) - PREMIUM plan only
 */
router.get('/:wheelId/leads.csv', roleGuard([Role.ADMIN, Role.SUPER]), playController.getWheelLeadsCsv);

// Slot routes
/**
 * @route   GET /companies/:companyId/wheels/:wheelId/slots
 * @desc    Get all slots for a wheel
 * @access  Private (ADMIN, SUB, SUPER)
 */
router.get('/:wheelId/slots', slotController.getSlots);

/**
 * @route   GET /companies/:companyId/wheels/:wheelId/slots/:slotId
 * @desc    Get a specific slot
 * @access  Private (ADMIN, SUB, SUPER)
 */
router.get('/:wheelId/slots/:slotId', slotController.getSlot);

/**
 * @route   POST /companies/:companyId/wheels/:wheelId/slots
 * @desc    Create a new slot
 * @access  Private (ADMIN, SUPER)
 */
router.post(
  '/:wheelId/slots',
  roleGuard([Role.ADMIN, Role.SUPER]),
  slotController.createSlot
);

/**
 * @route   PUT /companies/:companyId/wheels/:wheelId/slots/:slotId
 * @desc    Update an existing slot
 * @access  Private (ADMIN, SUPER)
 */
router.put(
  '/:wheelId/slots/:slotId',
  roleGuard([Role.ADMIN, Role.SUPER]),
  slotController.updateSlot
);

/**
 * @route   DELETE /companies/:companyId/wheels/:wheelId/slots/:slotId
 * @desc    Delete a slot
 * @access  Private (ADMIN, SUPER)
 */
router.delete(
  '/:wheelId/slots/:slotId',
  roleGuard([Role.ADMIN, Role.SUPER]),
  slotController.deleteSlot
);

/**
 * @route   POST /companies/:companyId/wheels/:wheelId/slots/bulk
 * @desc    Bulk create or update slots
 * @access  Private (ADMIN, SUPER)
 */
router.post(
  '/:wheelId/slots/bulk',
  roleGuard([Role.ADMIN, Role.SUPER]),
  slotController.bulkUpdateSlots
);

export default router; 