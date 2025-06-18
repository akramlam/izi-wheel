import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { 
  getEmailStatistics, 
  getEmailLogs, 
  getEmailDashboard 
} from '../controllers/email-tracking.controller';

const router: Router = Router();

// All email tracking routes require authentication
router.use(authMiddleware);

/**
 * GET /api/emails/stats
 * Get email statistics for the user's company
 * Query params:
 * - companyId (optional, SUPER admin only): specific company to view
 */
router.get('/stats', getEmailStatistics);

/**
 * GET /api/emails/logs
 * Get recent email logs for the user's company
 * Query params:
 * - limit (optional): number of logs to return (default: 50)
 * - offset (optional): pagination offset (default: 0)
 * - companyId (optional, SUPER admin only): specific company to view
 */
router.get('/logs', getEmailLogs);

/**
 * GET /api/emails/dashboard
 * Get email dashboard data (stats + recent logs)
 * Query params:
 * - companyId (optional, SUPER admin only): specific company to view
 */
router.get('/dashboard', getEmailDashboard);

export default router;