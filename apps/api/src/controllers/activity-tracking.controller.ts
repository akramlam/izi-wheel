import { Request, Response } from 'express';
import { 
  getActivityStats, 
  getRecentActivities, 
  getUserActivityHistory,
  getDetailedPlayHistory
} from '../utils/activity-logger';
import prisma from '../utils/db';

/**
 * Get comprehensive activity statistics
 */
export const getActivityStatistics = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const timeframe = req.query.timeframe as 'day' | 'week' | 'month' || 'day';
    
    // For SUPER admins, allow viewing all companies or specific company
    let companyId: string | undefined;
    if (user.role === 'SUPER') {
      companyId = req.query.companyId as string;
    } else {
      // For regular admins, only show their company's data
      companyId = user.companyId || undefined;
    }

    const stats = await getActivityStats(companyId, timeframe);
    
    if (!stats) {
      return res.status(500).json({ error: 'Failed to retrieve activity statistics' });
    }

    res.json({
      success: true,
      data: stats,
      companyId: companyId || 'all',
      timeframe
    });
  } catch (error) {
    console.error('Error getting activity statistics:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get detailed play history with user information
 */
export const getPlayHistory = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse query parameters
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const wheelId = req.query.wheelId as string;
    const result = req.query.result as 'WIN' | 'LOSE';
    const status = req.query.status as string;
    const search = req.query.search as string;

    // For SUPER admins, allow viewing all companies or specific company
    let companyId: string | undefined;
    if (user.role === 'SUPER') {
      companyId = req.query.companyId as string;
    } else {
      // For regular admins, only show their company's data
      companyId = user.companyId || undefined;
    }

    // Build where clause
    const whereClause: any = {};
    
    if (companyId) {
      whereClause.companyId = companyId;
    }
    
    if (wheelId) {
      whereClause.wheelId = wheelId;
    }
    
    if (result) {
      whereClause.result = result;
    }
    
    if (status) {
      whereClause.redemptionStatus = status;
    }
    
    if (search) {
      whereClause.OR = [
        { 
          leadInfo: {
            path: ['name'],
            string_contains: search,
            mode: 'insensitive'
          }
        },
        { 
          leadInfo: {
            path: ['email'],
            string_contains: search,
            mode: 'insensitive'
          }
        },
        { pin: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get plays with detailed information
    const plays = await prisma.play.findMany({
      where: whereClause,
      include: {
        wheel: {
          select: {
            name: true,
            company: {
              select: {
                name: true
              }
            }
          }
        },
        slot: {
          select: {
            label: true,
            prizeCode: true,
            color: true,
            isWinning: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    // Get total count for pagination
    const totalPlays = await prisma.play.count({ where: whereClause });

    // Calculate statistics
    const winCount = plays.filter(p => p.result === 'WIN').length;
    const loseCount = plays.filter(p => p.result === 'LOSE').length;
    const claimedCount = plays.filter(p => p.redemptionStatus === 'CLAIMED').length;
    const redeemedCount = plays.filter(p => p.redemptionStatus === 'REDEEMED').length;

    res.json({
      success: true,
      data: {
        plays: plays.map(play => ({
          id: play.id,
          result: play.result,
          redemptionStatus: play.redemptionStatus,
          createdAt: play.createdAt,
          claimedAt: play.claimedAt,
          redeemedAt: play.redeemedAt,
          pin: play.pin,
          ip: play.ip,
          wheel: {
            name: play.wheel.name,
            company: play.wheel.company.name
          },
          slot: {
            label: play.slot.label,
            prizeCode: play.slot.prizeCode,
            color: play.slot.color,
            isWinning: play.slot.isWinning
          },
          leadInfo: play.leadInfo
        })),
        statistics: {
          total: totalPlays,
          wins: winCount,
          losses: loseCount,
          claimed: claimedCount,
          redeemed: redeemedCount,
          winRate: totalPlays > 0 ? Math.round((winCount / totalPlays) * 100) : 0
        },
        pagination: {
          total: totalPlays,
          limit,
          offset,
          hasMore: offset + limit < totalPlays,
          totalPages: Math.ceil(totalPlays / limit),
          currentPage: Math.floor(offset / limit) + 1
        }
      },
      companyId: companyId || 'all'
    });
  } catch (error) {
    console.error('Error getting play history:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get user activity logs
 */
export const getUserActivities = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const userId = req.query.userId as string;

    // Only SUPER and ADMIN users can view user activities
    if (user.role !== 'SUPER' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // If userId is provided, get specific user's activities
    // Otherwise get recent activities for the company
    let activities;
    if (userId) {
      activities = await getUserActivityHistory(userId, limit);
    } else {
      const companyId = user.role === 'SUPER' ? 
        (req.query.companyId as string) : 
        user.companyId;
      activities = await getRecentActivities(companyId, limit);
    }

    res.json({
      success: true,
      data: activities,
      userId: userId || null,
      companyId: user.companyId || 'all'
    });
  } catch (error) {
    console.error('Error getting user activities:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get comprehensive dashboard data for traceability
 */
export const getTraceabilityDashboard = async (req: Request, res: Response) => {
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

    // Get all data in parallel
    const [
      activityStats,
      recentPlays,
      recentActivities
    ] = await Promise.all([
      getActivityStats(companyId, 'day'),
      getDetailedPlayHistory(companyId, undefined, 10),
      getRecentActivities(companyId, 10)
    ]);

    // Get additional play statistics from database
    const whereClause = companyId ? { companyId } : {};
    
    const [
      totalPlays,
      totalWins,
      totalClaimed,
      totalRedeemed,
      todayPlays
    ] = await Promise.all([
      prisma.play.count({ where: whereClause }),
      prisma.play.count({ where: { ...whereClause, result: 'WIN' } }),
      prisma.play.count({ where: { ...whereClause, redemptionStatus: 'CLAIMED' } }),
      prisma.play.count({ where: { ...whereClause, redemptionStatus: 'REDEEMED' } }),
      prisma.play.count({ 
        where: { 
          ...whereClause,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        } 
      })
    ]);

    // Get top performing wheels
    const topWheels = await prisma.wheel.findMany({
      where: companyId ? { companyId } : {},
      include: {
        plays: {
          select: { result: true }
        },
        _count: {
          select: { plays: true }
        }
      },
      orderBy: {
        plays: {
          _count: 'desc'
        }
      },
      take: 5
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalPlays,
          totalWins,
          totalClaimed,
          totalRedeemed,
          todayPlays,
          winRate: totalPlays > 0 ? Math.round((totalWins / totalPlays) * 100) : 0,
          claimRate: totalWins > 0 ? Math.round((totalClaimed / totalWins) * 100) : 0,
          redeemRate: totalClaimed > 0 ? Math.round((totalRedeemed / totalClaimed) * 100) : 0
        },
        activityStats,
        recentPlays: recentPlays.map(play => ({
          id: play.id,
          result: play.result,
          redemptionStatus: play.redemptionStatus,
          createdAt: play.createdAt,
          wheel: play.wheel,
          slot: play.slot,
          leadInfo: play.leadInfo
        })),
        recentActivities,
        topWheels: topWheels.map(wheel => ({
          id: wheel.id,
          name: wheel.name,
          totalPlays: wheel._count.plays,
          wins: wheel.plays.filter(p => p.result === 'WIN').length,
          winRate: wheel._count.plays > 0 ? 
            Math.round((wheel.plays.filter(p => p.result === 'WIN').length / wheel._count.plays) * 100) : 0
        })),
        companyId: companyId || 'all'
      }
    });
  } catch (error) {
    console.error('Error getting traceability dashboard:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Export play data for compliance/audit purposes
 */
export const exportPlayData = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Only SUPER and ADMIN users can export data
    if (user.role !== 'SUPER' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const format = req.query.format as string || 'json';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    // For SUPER admins, allow viewing all companies or specific company
    let companyId: string | undefined;
    if (user.role === 'SUPER') {
      companyId = req.query.companyId as string;
    } else {
      companyId = user.companyId || undefined;
    }

    // Build where clause
    const whereClause: any = {};
    
    if (companyId) {
      whereClause.companyId = companyId;
    }
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Get all plays for export
    const plays = await prisma.play.findMany({
      where: whereClause,
      include: {
        wheel: {
          select: {
            name: true,
            company: {
              select: {
                name: true
              }
            }
          }
        },
        slot: {
          select: {
            label: true,
            prizeCode: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const exportData = plays.map(play => ({
      playId: play.id,
      date: play.createdAt.toISOString(),
      company: play.wheel.company.name,
      wheel: play.wheel.name,
      result: play.result,
      prize: play.slot.label,
      prizeCode: play.slot.prizeCode,
      pin: play.pin,
      status: play.redemptionStatus,
      claimedAt: play.claimedAt?.toISOString(),
      redeemedAt: play.redeemedAt?.toISOString(),
      ipAddress: play.ip,
      leadInfo: play.leadInfo
    }));

    if (format === 'csv') {
      // Convert to CSV format
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => 
            JSON.stringify(row[header as keyof typeof row] || '')
          ).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="play-data-${Date.now()}.csv"`);
      res.send(csvContent);
    } else {
      // Return JSON
      res.json({
        success: true,
        data: exportData,
        meta: {
          totalRecords: exportData.length,
          exportDate: new Date().toISOString(),
          companyId: companyId || 'all',
          dateRange: { startDate, endDate }
        }
      });
    }
  } catch (error) {
    console.error('Error exporting play data:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 