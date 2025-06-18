import { Request, Response } from 'express';
import { getEmailStats, getRecentEmailLogs } from '../utils/email-logger';

/**
 * Get email statistics for the authenticated user's company
 */
export const getEmailStatistics = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // For SUPER admins, allow viewing all companies or specific company
    let companyId: string | undefined;
    if (user.role === 'SUPER') {
      companyId = req.query.companyId as string;
    } else {
      // For regular admins, only show their company's data
      companyId = user.companyId || undefined;
    }

    const stats = await getEmailStats(companyId);
    
    if (!stats) {
      return res.status(500).json({ error: 'Failed to retrieve email statistics' });
    }

    res.json({
      success: true,
      data: stats,
      companyId: companyId || 'all'
    });
  } catch (error) {
    console.error('Error getting email statistics:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get recent email logs for the authenticated user's company
 */
export const getEmailLogs = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse query parameters
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // For SUPER admins, allow viewing all companies or specific company
    let companyId: string | undefined;
    if (user.role === 'SUPER') {
      companyId = req.query.companyId as string;
    } else {
      // For regular admins, only show their company's data
      companyId = user.companyId || undefined;
    }

    const logs = await getRecentEmailLogs(companyId, limit);
    
    // Mock pagination info since we don't have real database yet
    const paginationInfo = {
      total: logs.length,
      limit,
      offset,
      hasMore: false
    };

    res.json({
      success: true,
      data: logs,
      pagination: paginationInfo,
      companyId: companyId || 'all'
    });
  } catch (error) {
    console.error('Error getting email logs:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get email tracking dashboard data
 */
export const getEmailDashboard = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // For SUPER admins, allow viewing all companies or specific company
    let companyId: string | undefined;
    if (user.role === 'SUPER') {
      companyId = req.query.companyId as string;
    } else {
      // For regular admins, only show their company's data
      companyId = user.companyId || undefined;
    }

    // Get both stats and recent logs
    const [stats, recentLogs] = await Promise.all([
      getEmailStats(companyId),
      getRecentEmailLogs(companyId, 10) // Last 10 emails for dashboard
    ]);

    if (!stats) {
      return res.status(500).json({ error: 'Failed to retrieve email data' });
    }

    res.json({
      success: true,
      data: {
        statistics: stats,
        recentLogs,
        companyId: companyId || 'all'
      }
    });
  } catch (error) {
    console.error('Error getting email dashboard:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 