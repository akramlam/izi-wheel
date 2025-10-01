/**
 * Email notification service for prize claims
 * This is a simple implementation that can be enhanced with real email service
 */

export interface PrizeEmailData {
  recipientEmail: string;
  recipientName: string;
  prizeName: string;
  pin: string;
  playId: string;
  companyId: string;
}

/**
 * Send prize notification email
 * @param data - Email data
 * @returns Promise<void>
 */
export async function sendPrizeEmail(data: PrizeEmailData): Promise<void> {
  // TODO: Implement with actual email service (SendGrid, AWS SES, etc.)
  // For now, just log the email that would be sent

  console.log('📧 Prize Email (Would Send):');
  console.log(`  To: ${data.recipientEmail}`);
  console.log(`  Name: ${data.recipientName}`);
  console.log(`  Prize: ${data.prizeName}`);
  console.log(`  PIN: ${data.pin}`);
  console.log(`  Play ID: ${data.playId}`);
  console.log('');
  console.log('Email Content:');
  console.log(`  Subject: Your Prize is Ready! 🎉`);
  console.log(`  Body:`);
  console.log(`    Congratulations ${data.recipientName}!`);
  console.log(`    You've won: ${data.prizeName}`);
  console.log(`    Your redemption PIN: ${data.pin}`);
  console.log(`    Redeem at: https://roue.izikado.fr/redeem/${data.playId}`);
  console.log('');

  // In production, replace with:
  // await emailService.send({
  //   to: data.recipientEmail,
  //   subject: 'Your Prize is Ready! 🎉',
  //   template: 'prize-claim',
  //   data: { ...data }
  // });
}
