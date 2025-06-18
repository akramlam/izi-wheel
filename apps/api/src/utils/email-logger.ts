import prisma from './db';

export enum EmailType {
  INVITATION = 'INVITATION',
  PRIZE_NOTIFICATION = 'PRIZE_NOTIFICATION', 
  PASSWORD_RESET = 'PASSWORD_RESET',
  WELCOME = 'WELCOME',
  NOTIFICATION = 'NOTIFICATION'
}

export enum EmailStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
  DELIVERED = 'DELIVERED'
}

export interface EmailLogData {
  type: EmailType;
  recipient: string;
  subject: string;
  companyId?: string;
  playId?: string;
  userId?: string;
  metadata?: any;
}

/**
 * Log an email attempt to the database
 */
export const logEmailAttempt = async (data: EmailLogData): Promise<string> => {
  try {
    // For now, we'll use a simple file-based logging system since the database migration isn't available
    // In production, this would create a record in the EmailLog table
    
    const emailLog = {
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: data.type,
      recipient: data.recipient,
      subject: data.subject,
      status: EmailStatus.PENDING,
      companyId: data.companyId,
      playId: data.playId,
      userId: data.userId,
      metadata: data.metadata,
      createdAt: new Date().toISOString()
    };

    // Log to console for now (in production this would be database)
    console.log(`[EMAIL_LOG] 📝 Email logged:`, {
      id: emailLog.id,
      type: emailLog.type,
      recipient: emailLog.recipient,
      subject: emailLog.subject,
      status: emailLog.status
    });

    return emailLog.id;
  } catch (error) {
    console.error('[EMAIL_LOG] ❌ Failed to log email:', error);
    return `fallback_${Date.now()}`;
  }
};

/**
 * Update email status after sending attempt
 */
export const updateEmailStatus = async (
  emailId: string, 
  status: EmailStatus, 
  messageId?: string, 
  errorMessage?: string
): Promise<void> => {
  try {
    const updateData = {
      status,
      messageId,
      errorMessage,
      sentAt: status === EmailStatus.SENT ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString()
    };

    // Log the status update
    console.log(`[EMAIL_LOG] 🔄 Email status updated:`, {
      emailId,
      status,
      messageId,
      errorMessage: errorMessage ? errorMessage.substring(0, 100) + '...' : undefined
    });

    // In production, this would update the database record
    // await prisma.emailLog.update({
    //   where: { id: emailId },
    //   data: updateData
    // });

  } catch (error) {
    console.error('[EMAIL_LOG] ❌ Failed to update email status:', error);
  }
};

/**
 * Get email statistics for a company
 */
export const getEmailStats = async (companyId?: string) => {
  try {
    // Mock data for now - in production this would query the database
    const stats = {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0,
      byType: {
        [EmailType.INVITATION]: 0,
        [EmailType.PRIZE_NOTIFICATION]: 0,
        [EmailType.PASSWORD_RESET]: 0,
        [EmailType.WELCOME]: 0,
        [EmailType.NOTIFICATION]: 0
      }
    };

    console.log(`[EMAIL_LOG] 📊 Email stats requested for company: ${companyId || 'all'}`);
    
    // In production, this would be:
    // const emailLogs = await prisma.emailLog.findMany({
    //   where: companyId ? { companyId } : {},
    //   select: { type: true, status: true }
    // });
    
    return stats;
  } catch (error) {
    console.error('[EMAIL_LOG] ❌ Failed to get email stats:', error);
    return null;
  }
};

/**
 * Get recent email logs for admin interface
 */
export const getRecentEmailLogs = async (companyId?: string, limit: number = 50): Promise<any[]> => {
  try {
    // Mock data for now - in production this would query the database
    const logs: any[] = [];

    console.log(`[EMAIL_LOG] 📋 Recent email logs requested for company: ${companyId || 'all'}, limit: ${limit}`);
    
    // In production, this would be:
    // const logs = await prisma.emailLog.findMany({
    //   where: companyId ? { companyId } : {},
    //   include: {
    //     company: { select: { name: true } },
    //     user: { select: { name: true, email: true } },
    //     play: { 
    //       select: { 
    //         id: true, 
    //         slot: { select: { label: true } },
    //         wheel: { select: { name: true } }
    //       } 
    //     }
    //   },
    //   orderBy: { createdAt: 'desc' },
    //   take: limit
    // });
    
    return logs;
  } catch (error) {
    console.error('[EMAIL_LOG] ❌ Failed to get recent email logs:', error);
    return [];
  }
}; 