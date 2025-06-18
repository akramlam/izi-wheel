import prisma from './db';

export enum ActivityType {
  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_PASSWORD_CHANGED = 'USER_PASSWORD_CHANGED',
  USER_INVITED = 'USER_INVITED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  
  // Wheel Activities
  WHEEL_CREATED = 'WHEEL_CREATED',
  WHEEL_UPDATED = 'WHEEL_UPDATED',
  WHEEL_ACTIVATED = 'WHEEL_ACTIVATED',
  WHEEL_DEACTIVATED = 'WHEEL_DEACTIVATED',
  WHEEL_DELETED = 'WHEEL_DELETED',
  
  // Play Activities
  WHEEL_SPUN = 'WHEEL_SPUN',
  PRIZE_WON = 'PRIZE_WON',
  PRIZE_LOST = 'PRIZE_LOST',
  PRIZE_CLAIMED = 'PRIZE_CLAIMED',
  PRIZE_REDEEMED = 'PRIZE_REDEEMED',
  
  // Email Activities
  EMAIL_SENT = 'EMAIL_SENT',
  EMAIL_FAILED = 'EMAIL_FAILED',
  EMAIL_OPENED = 'EMAIL_OPENED',
  EMAIL_CLICKED = 'EMAIL_CLICKED',
  
  // Company Activities
  COMPANY_CREATED = 'COMPANY_CREATED',
  COMPANY_UPDATED = 'COMPANY_UPDATED',
  PLAN_CHANGED = 'PLAN_CHANGED',
  
  // Security Activities
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  
  // System Activities
  API_ERROR = 'API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE'
}

export enum ActivitySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ActivityLogData {
  type: ActivityType;
  severity?: ActivitySeverity;
  description: string;
  // Context
  userId?: string;
  companyId?: string;
  wheelId?: string;
  playId?: string;
  emailId?: string;
  // Request info
  ipAddress?: string;
  userAgent?: string;
  // Additional data
  metadata?: any;
  // Timestamps
  timestamp?: Date;
}

/**
 * Log an activity to the system
 */
export const logActivity = async (data: ActivityLogData): Promise<string> => {
  try {
    const activityLog = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: data.type,
      severity: data.severity || ActivitySeverity.LOW,
      description: data.description,
      userId: data.userId,
      companyId: data.companyId,
      wheelId: data.wheelId,
      playId: data.playId,
      emailId: data.emailId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: data.metadata,
      timestamp: data.timestamp || new Date(),
      createdAt: new Date().toISOString()
    };

    // Log to console with severity-based formatting
    const severityEmoji = {
      [ActivitySeverity.LOW]: '📝',
      [ActivitySeverity.MEDIUM]: '⚠️',
      [ActivitySeverity.HIGH]: '🚨',
      [ActivitySeverity.CRITICAL]: '🔥'
    };

    console.log(`[ACTIVITY_LOG] ${severityEmoji[activityLog.severity]} ${activityLog.type}:`, {
      id: activityLog.id,
      description: activityLog.description,
      userId: activityLog.userId,
      companyId: activityLog.companyId,
      severity: activityLog.severity
    });

    // In production, this would save to database
    // await prisma.activityLog.create({ data: activityLog });

    return activityLog.id;
  } catch (error) {
    console.error('[ACTIVITY_LOG] ❌ Failed to log activity:', error);
    return `fallback_${Date.now()}`;
  }
};

/**
 * Log a user play activity
 */
export const logPlayActivity = async (
  playData: {
    playId: string;
    wheelId: string;
    companyId: string;
    result: 'WIN' | 'LOSE';
    slotLabel?: string;
    pin?: string;
    ipAddress?: string;
    userAgent?: string;
    leadInfo?: any;
  }
): Promise<void> => {
  try {
    // Log the spin activity
    await logActivity({
      type: ActivityType.WHEEL_SPUN,
      severity: ActivitySeverity.LOW,
      description: `Wheel spun - Result: ${playData.result}`,
      companyId: playData.companyId,
      wheelId: playData.wheelId,
      playId: playData.playId,
      ipAddress: playData.ipAddress,
      userAgent: playData.userAgent,
      metadata: {
        result: playData.result,
        slotLabel: playData.slotLabel,
        leadInfo: playData.leadInfo
      }
    });

    // Log specific result activity
    if (playData.result === 'WIN') {
      await logActivity({
        type: ActivityType.PRIZE_WON,
        severity: ActivitySeverity.MEDIUM,
        description: `Prize won: ${playData.slotLabel || 'Unknown Prize'}`,
        companyId: playData.companyId,
        wheelId: playData.wheelId,
        playId: playData.playId,
        ipAddress: playData.ipAddress,
        userAgent: playData.userAgent,
        metadata: {
          prize: playData.slotLabel,
          pin: playData.pin,
          leadInfo: playData.leadInfo
        }
      });
    } else {
      await logActivity({
        type: ActivityType.PRIZE_LOST,
        severity: ActivitySeverity.LOW,
        description: 'No prize won on wheel spin',
        companyId: playData.companyId,
        wheelId: playData.wheelId,
        playId: playData.playId,
        ipAddress: playData.ipAddress,
        userAgent: playData.userAgent
      });
    }
  } catch (error) {
    console.error('[ACTIVITY_LOG] ❌ Failed to log play activity:', error);
  }
};

/**
 * Log user authentication activity
 */
export const logAuthActivity = async (
  type: ActivityType.USER_LOGIN | ActivityType.USER_LOGOUT | ActivityType.LOGIN_FAILED,
  userId?: string,
  email?: string,
  ipAddress?: string,
  userAgent?: string,
  errorMessage?: string
): Promise<void> => {
  try {
    const descriptions = {
      [ActivityType.USER_LOGIN]: `User logged in: ${email || 'Unknown'}`,
      [ActivityType.USER_LOGOUT]: `User logged out: ${email || 'Unknown'}`,
      [ActivityType.LOGIN_FAILED]: `Login failed for: ${email || 'Unknown'}`
    };

    const severities = {
      [ActivityType.USER_LOGIN]: ActivitySeverity.LOW,
      [ActivityType.USER_LOGOUT]: ActivitySeverity.LOW,
      [ActivityType.LOGIN_FAILED]: ActivitySeverity.MEDIUM
    };

    await logActivity({
      type,
      severity: severities[type],
      description: descriptions[type],
      userId,
      ipAddress,
      userAgent,
      metadata: {
        email,
        errorMessage
      }
    });
  } catch (error) {
    console.error('[ACTIVITY_LOG] ❌ Failed to log auth activity:', error);
  }
};

/**
 * Log wheel management activity
 */
export const logWheelActivity = async (
  type: ActivityType.WHEEL_CREATED | ActivityType.WHEEL_UPDATED | ActivityType.WHEEL_ACTIVATED | ActivityType.WHEEL_DEACTIVATED,
  wheelId: string,
  wheelName: string,
  companyId: string,
  userId: string,
  changes?: any
): Promise<void> => {
  try {
    const descriptions = {
      [ActivityType.WHEEL_CREATED]: `Wheel created: ${wheelName}`,
      [ActivityType.WHEEL_UPDATED]: `Wheel updated: ${wheelName}`,
      [ActivityType.WHEEL_ACTIVATED]: `Wheel activated: ${wheelName}`,
      [ActivityType.WHEEL_DEACTIVATED]: `Wheel deactivated: ${wheelName}`
    };

    await logActivity({
      type,
      severity: ActivitySeverity.MEDIUM,
      description: descriptions[type],
      userId,
      companyId,
      wheelId,
      metadata: {
        wheelName,
        changes
      }
    });
  } catch (error) {
    console.error('[ACTIVITY_LOG] ❌ Failed to log wheel activity:', error);
  }
};

/**
 * Log email activity
 */
export const logEmailActivity = async (
  type: ActivityType.EMAIL_SENT | ActivityType.EMAIL_FAILED,
  emailId: string,
  recipient: string,
  subject: string,
  companyId?: string,
  userId?: string,
  errorMessage?: string
): Promise<void> => {
  try {
    const descriptions = {
      [ActivityType.EMAIL_SENT]: `Email sent to ${recipient}: ${subject}`,
      [ActivityType.EMAIL_FAILED]: `Email failed to ${recipient}: ${subject}`
    };

    const severities = {
      [ActivityType.EMAIL_SENT]: ActivitySeverity.LOW,
      [ActivityType.EMAIL_FAILED]: ActivitySeverity.MEDIUM
    };

    await logActivity({
      type,
      severity: severities[type],
      description: descriptions[type],
      userId,
      companyId,
      emailId,
      metadata: {
        recipient,
        subject,
        errorMessage
      }
    });
  } catch (error) {
    console.error('[ACTIVITY_LOG] ❌ Failed to log email activity:', error);
  }
};

/**
 * Get activity statistics
 */
export const getActivityStats = async (companyId?: string, timeframe?: 'day' | 'week' | 'month') => {
  try {
    // Mock data for now - in production this would query the database
    const stats = {
      totalActivities: 0,
      byType: {
        [ActivityType.WHEEL_SPUN]: 0,
        [ActivityType.PRIZE_WON]: 0,
        [ActivityType.USER_LOGIN]: 0,
        [ActivityType.EMAIL_SENT]: 0
      },
      bySeverity: {
        [ActivitySeverity.LOW]: 0,
        [ActivitySeverity.MEDIUM]: 0,
        [ActivitySeverity.HIGH]: 0,
        [ActivitySeverity.CRITICAL]: 0
      },
      timeframe: timeframe || 'day'
    };

    console.log(`[ACTIVITY_LOG] 📊 Activity stats requested for company: ${companyId || 'all'}, timeframe: ${timeframe || 'day'}`);
    
    return stats;
  } catch (error) {
    console.error('[ACTIVITY_LOG] ❌ Failed to get activity stats:', error);
    return null;
  }
};

/**
 * Get recent activities
 */
export const getRecentActivities = async (companyId?: string, limit: number = 50): Promise<any[]> => {
  try {
    // Mock data for now - in production this would query the database
    const activities: any[] = [];

    console.log(`[ACTIVITY_LOG] 📋 Recent activities requested for company: ${companyId || 'all'}, limit: ${limit}`);
    
    return activities;
  } catch (error) {
    console.error('[ACTIVITY_LOG] ❌ Failed to get recent activities:', error);
    return [];
  }
};

/**
 * Get user activity history
 */
export const getUserActivityHistory = async (userId: string, limit: number = 100): Promise<any[]> => {
  try {
    // Mock data for now - in production this would query the database
    const activities: any[] = [];

    console.log(`[ACTIVITY_LOG] 👤 User activity history requested for user: ${userId}, limit: ${limit}`);
    
    return activities;
  } catch (error) {
    console.error('[ACTIVITY_LOG] ❌ Failed to get user activity history:', error);
    return [];
  }
};

/**
 * Get play history with detailed information
 */
export const getDetailedPlayHistory = async (companyId?: string, wheelId?: string, limit: number = 100) => {
  try {
    const whereClause: any = {};
    
    if (companyId) {
      whereClause.companyId = companyId;
    }
    
    if (wheelId) {
      whereClause.wheelId = wheelId;
    }

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
            color: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    console.log(`[ACTIVITY_LOG] 🎯 Detailed play history requested - Found ${plays.length} plays`);
    
    return plays;
  } catch (error) {
    console.error('[ACTIVITY_LOG] ❌ Failed to get detailed play history:', error);
    return [];
  }
}; 