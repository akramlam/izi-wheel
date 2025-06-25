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
    // Create a record in the EmailLog table
    const emailLog = await prisma.emailLog.create({
      data: {
        type: data.type,
        recipient: data.recipient,
        subject: data.subject,
        status: EmailStatus.PENDING,
        companyId: data.companyId,
        playId: data.playId,
        userId: data.userId,
        metadata: data.metadata
      }
    });

    // Log to console for debugging
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
    // Return a fallback ID if database fails
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
      sentAt: status === EmailStatus.SENT ? new Date() : undefined
    };

    // Log the status update
    console.log(`[EMAIL_LOG] 🔄 Email status updated:`, {
      emailId,
      status,
      messageId,
      errorMessage: errorMessage ? errorMessage.substring(0, 100) + '...' : undefined
    });

    // Update the database record
    await prisma.emailLog.update({
      where: { id: emailId },
      data: updateData
    });

  } catch (error) {
    console.error('[EMAIL_LOG] ❌ Failed to update email status:', error);
  }
};

/**
 * Get email statistics for a company
 */
export const getEmailStats = async (companyId?: string) => {
  try {
    console.log(`[EMAIL_LOG] 📊 Email stats requested for company: ${companyId || 'all'}`);
    
    // Query the database for email statistics
    const emailLogs = await prisma.emailLog.findMany({
      where: companyId ? { companyId } : {},
      select: { type: true, status: true }
    });

    // Calculate statistics
    const stats = {
      total: emailLogs.length,
      sent: emailLogs.filter(log => log.status === EmailStatus.SENT).length,
      failed: emailLogs.filter(log => log.status === EmailStatus.FAILED).length,
      pending: emailLogs.filter(log => log.status === EmailStatus.PENDING).length,
      byType: {
        [EmailType.INVITATION]: emailLogs.filter(log => log.type === EmailType.INVITATION).length,
        [EmailType.PRIZE_NOTIFICATION]: emailLogs.filter(log => log.type === EmailType.PRIZE_NOTIFICATION).length,
        [EmailType.PASSWORD_RESET]: emailLogs.filter(log => log.type === EmailType.PASSWORD_RESET).length,
        [EmailType.WELCOME]: emailLogs.filter(log => log.type === EmailType.WELCOME).length,
        [EmailType.NOTIFICATION]: emailLogs.filter(log => log.type === EmailType.NOTIFICATION).length
      }
    };
    
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
    console.log(`[EMAIL_LOG] 📋 Recent email logs requested for company: ${companyId || 'all'}, limit: ${limit}`);
    
    // Query the database for recent email logs
    const logs = await prisma.emailLog.findMany({
      where: companyId ? { companyId } : {},
      include: {
        company: { select: { name: true } },
        user: { select: { name: true, email: true } },
        play: { 
          select: { 
            id: true, 
            slot: { select: { label: true } },
            wheel: { select: { name: true } }
          } 
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    return logs;
  } catch (error) {
    console.error('[EMAIL_LOG] ❌ Failed to get recent email logs:', error);
    return [];
  }
}; 