import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { 
  getActivityStatistics,
  getPlayHistory,
  getUserActivities,
  getTraceabilityDashboard,
  exportPlayData
} from '../controllers/activity-tracking.controller';

const router: Router = Router();

// All activity tracking routes require authentication
router.use(authMiddleware);

/**
 * GET /api/activity/stats
 * Get comprehensive activity statistics
 * Query params:
 * - timeframe (optional): 'day' | 'week' | 'month' (default: 'day')
 * - companyId (optional, SUPER admin only): specific company to view
 */
router.get('/stats', getActivityStatistics);

/**
 * GET /api/activity/plays
 * Get detailed play history with filtering and pagination
 * Query params:
 * - limit (optional): number of records to return (default: 100)
 * - offset (optional): pagination offset (default: 0)
 * - wheelId (optional): filter by specific wheel
 * - result (optional): filter by 'WIN' or 'LOSE'
 * - status (optional): filter by redemption status
 * - search (optional): search in lead info (name, email) or PIN
 * - companyId (optional, SUPER admin only): specific company to view
 */
router.get('/plays', getPlayHistory);

/**
 * GET /api/activity/users
 * Get user activity logs
 * Query params:
 * - limit (optional): number of records to return (default: 50)
 * - userId (optional): specific user's activities
 * - companyId (optional, SUPER admin only): specific company to view
 */
router.get('/users', getUserActivities);

/**
 * GET /api/activity/dashboard
 * Get comprehensive traceability dashboard data
 * Query params:
 * - companyId (optional, SUPER admin only): specific company to view
 */
router.get('/dashboard', getTraceabilityDashboard);

/**
 * GET /api/activity/export
 * Export play data for compliance/audit purposes
 * Query params:
 * - format (optional): 'json' | 'csv' (default: 'json')
 * - startDate (optional): start date for export range
 * - endDate (optional): end date for export range
 * - companyId (optional, SUPER admin only): specific company to view
 */
router.get('/export', exportPlayData);

export default router; 