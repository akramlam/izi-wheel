import { Request, Response } from 'express';
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

    // TODO: Re-implement activity stats after refactoring
    // const stats = await getActivityStats(companyId, timeframe);

    res.json({
      success: true,
      data: {
        totalPlays: 0,
        totalWins: 0,
        totalLeads: 0,
        conversionRate: 0
      },
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
      if (status === 'CLAIMED') {
        // For the new 2-step system: CLAIMED means PENDING + claimedAt
        whereClause.redemptionStatus = 'PENDING';
        whereClause.claimedAt = { not: null };
      } else if (status === 'PENDING') {
        // PENDING now means PENDING + no claimedAt (not yet claimed)
        whereClause.redemptionStatus = 'PENDING';
        whereClause.claimedAt = null;
      } else {
        whereClause.redemptionStatus = status;
      }
    }
    
    // Get plays with detailed information
    let plays: any[];
    if (search) {
      // Use raw SQL for JSON search since Prisma's JSON operators are limited
      const searchQuery = `
        SELECT p.*, 
               w.name as wheel_name, 
               c.name as company_name,
               s.label as slot_label,
               s."prizeCode" as slot_prize_code,
               s.color as slot_color,
               s."isWinning" as slot_is_winning
        FROM "Play" p
        JOIN "Wheel" w ON p."wheelId" = w.id
        JOIN "Company" c ON w."companyId" = c.id
        JOIN "Slot" s ON p."slotId" = s.id
        WHERE 1=1
        ${companyId ? `AND p."companyId" = '${companyId}'` : ''}
        ${wheelId ? `AND p."wheelId" = '${wheelId}'` : ''}
        ${result ? `AND p.result = '${result}'` : ''}
        ${status ? (
          status === 'CLAIMED' ? `AND p."redemptionStatus" = 'PENDING' AND p."claimedAt" IS NOT NULL` :
          status === 'PENDING' ? `AND p."redemptionStatus" = 'PENDING' AND p."claimedAt" IS NULL` :
          `AND p."redemptionStatus" = '${status}'`
        ) : ''}
        AND (
          LOWER(p."leadInfo"->>'name') LIKE LOWER('%${search}%') OR
          LOWER(p."leadInfo"->>'email') LIKE LOWER('%${search}%') OR
          LOWER(p."leadInfo"->>'phone') LIKE LOWER('%${search}%') OR
          LOWER(p.pin) LIKE LOWER('%${search}%') OR
          LOWER(c.name) LIKE LOWER('%${search}%')
        )
        ORDER BY p."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      const rawPlays = await prisma.$queryRawUnsafe(searchQuery);
      
      // Transform raw results to match the expected format
      plays = (rawPlays as any[]).map(play => ({
        id: play.id,
        result: play.result,
        redemptionStatus: play.redemptionStatus,
        createdAt: play.createdAt,
        claimedAt: play.claimedAt,
        redeemedAt: play.redeemedAt,
        pin: play.pin,
        ip: play.ip,
        leadInfo: play.leadInfo,
        wheel: {
          name: play.wheel_name,
          company: {
            name: play.company_name
          }
        },
        slot: {
          label: play.slot_label,
          prizeCode: play.slot_prize_code,
          color: play.slot_color,
          isWinning: play.slot_is_winning
        }
      }));
    } else {
      // Use regular Prisma query when no search
      plays = await prisma.play.findMany({
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
    }

    // Get total count for pagination
    let totalPlays;
    if (search) {
      // Use raw SQL for count when search is used
      const countQuery = `
        SELECT COUNT(*) as count
        FROM "Play" p
        JOIN "Wheel" w ON p."wheelId" = w.id
        JOIN "Company" c ON w."companyId" = c.id
        JOIN "Slot" s ON p."slotId" = s.id
        WHERE 1=1
        ${companyId ? `AND p."companyId" = '${companyId}'` : ''}
        ${wheelId ? `AND p."wheelId" = '${wheelId}'` : ''}
        ${result ? `AND p.result = '${result}'` : ''}
        ${status ? (
          status === 'CLAIMED' ? `AND p."redemptionStatus" = 'PENDING' AND p."claimedAt" IS NOT NULL` :
          status === 'PENDING' ? `AND p."redemptionStatus" = 'PENDING' AND p."claimedAt" IS NULL` :
          `AND p."redemptionStatus" = '${status}'`
        ) : ''}
        AND (
          LOWER(p."leadInfo"->>'name') LIKE LOWER('%${search}%') OR
          LOWER(p."leadInfo"->>'email') LIKE LOWER('%${search}%') OR
          LOWER(p."leadInfo"->>'phone') LIKE LOWER('%${search}%') OR
          LOWER(p.pin) LIKE LOWER('%${search}%') OR
          LOWER(c.name) LIKE LOWER('%${search}%')
        )
      `;
      
      const countResult = await prisma.$queryRawUnsafe(countQuery) as any[];
      totalPlays = parseInt(countResult[0].count);
    } else {
      totalPlays = await prisma.play.count({ where: whereClause });
    }

    // Calculate statistics
    const winCount = plays.filter(p => p.result === 'WIN').length;
    const loseCount = plays.filter(p => p.result === 'LOSE').length;
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

    // TODO: Re-implement activity tracking after refactoring
    // If userId is provided, get specific user's activities
    // Otherwise get recent activities for the company
    const activities: any[] = [];

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

    // Get date range from query params (default to 30 days)
    const range = req.query.range as string || '30d';
    
    // Handle different range values including 'all'
    let days: number;
    let startDate: Date;
    
    if (range === 'all') {
      // For 'all', get data from the beginning of time
      days = 365; // Use a large number to show meaningful data
      startDate = new Date(0); // Beginning of time
    } else {
      // For numeric ranges (7d, 30d, 90d)
      days = parseInt(range.replace('d', '')) || 30;
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
    }

    // TODO: Re-implement activity stats after refactoring
    // Get all data in parallel
    const activityStats = {
      totalPlays: 0,
      totalWins: 0,
      totalLeads: 0,
      conversionRate: 0
    };
    const recentPlays: any[] = [];
    const recentActivities: any[] = [];

    // Get additional play statistics from database
    const whereClause = companyId ? { companyId } : {};
    const whereClauseWithDate = { 
      ...whereClause, 
      createdAt: { gte: startDate } 
    };
    
    const [
      totalPlays,
      totalWins,
      totalClaimed,
      totalRedeemed,
      todayPlays
    ] = await Promise.all([
      prisma.play.count({ where: whereClauseWithDate }),
      prisma.play.count({ where: { ...whereClauseWithDate, result: 'WIN' } }),
      prisma.play.count({ where: { ...whereClauseWithDate, redemptionStatus: 'PENDING', claimedAt: { not: null } } }),
      prisma.play.count({ where: { ...whereClauseWithDate, redemptionStatus: 'REDEEMED' } }),
      prisma.play.count({ 
        where: { 
          ...whereClause,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        } 
      })
    ]);

    // Get plays by day for the chart
    const playsByDayQuery = await prisma.play.findMany({
      where: whereClauseWithDate,
      select: {
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Group plays by day
    const playsByDayMap = new Map<string, number>();
    
    if (range === 'all') {
      // For 'all', don't pre-initialize days, just use actual data
      // This will show only days where there are actual plays
    } else {
      // Initialize all days in range with 0 for specific ranges
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        playsByDayMap.set(dateKey, 0);
      }
    }
    
    // Count actual plays per day
    playsByDayQuery.forEach(play => {
      const dateKey = play.createdAt.toISOString().split('T')[0];
      const currentCount = playsByDayMap.get(dateKey) || 0;
      playsByDayMap.set(dateKey, currentCount + 1);
    });

    // Convert to array format
    const playsByDay = Array.from(playsByDayMap.entries()).map(([date, count]) => ({
      date,
      count
    }));

    // Get top performing wheels
    const topWheels = await prisma.wheel.findMany({
      where: companyId ? { companyId } : {},
      include: {
        plays: {
          select: { result: true },
          where: { createdAt: { gte: startDate } }
        },
        _count: {
          select: { 
            plays: {
              where: { createdAt: { gte: startDate } }
            }
          }
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
          redeemRate: totalWins > 0 ? Math.round((totalRedeemed / totalWins) * 100) : 0
        },
        playsByDay,
        activityStats,
        recentPlays: recentPlays.map((play: any) => ({
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
        companyId: companyId || 'all',
        dateRange: range
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
        ...exportData.map((row: any) => 
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