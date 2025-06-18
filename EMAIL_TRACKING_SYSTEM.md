# 📧 Email Tracking & Traceability System

## Overview

The IZI Wheel application now includes a comprehensive email tracking and traceability system that logs all sent emails for audit purposes and provides detailed analytics through an admin interface.

## Features

### 🔍 Email Traceability
- **Complete Audit Trail**: Every email sent by the system is logged with full metadata
- **Status Tracking**: Real-time status updates (Pending, Sent, Failed, Bounced, Delivered)
- **Error Logging**: Detailed error messages for failed deliveries
- **Message ID Tracking**: Unique identifiers for each sent email

### 📊 Analytics & Statistics
- **Email Volume Metrics**: Total sent, successful, failed, and pending emails
- **Type Breakdown**: Statistics by email type (invitations, prizes, notifications, etc.)
- **Success Rate Monitoring**: Track delivery success rates over time
- **Company-Specific Stats**: Isolated metrics for each company

### 🎯 Admin Interface
- **Real-time Dashboard**: Live email statistics and recent activity
- **Advanced Filtering**: Search by recipient, subject, type, or status
- **Detailed Logs**: Complete email history with metadata
- **Export Capabilities**: Download logs for compliance or analysis

## Email Types Tracked

| Type | Description | Triggered By |
|------|-------------|--------------|
| `INVITATION` | Admin/sub-admin invitation emails | User invitation process |
| `PRIZE_NOTIFICATION` | Prize claim emails with codes | Wheel spin wins |
| `PASSWORD_RESET` | Password reset emails | Password reset requests |
| `WELCOME` | Welcome emails for new users | User registration |
| `NOTIFICATION` | General system notifications | Various system events |

## Email Status Lifecycle

```
PENDING → SENT → DELIVERED
    ↓
  FAILED
    ↓
  BOUNCED
```

- **PENDING**: Email queued for sending
- **SENT**: Successfully sent to email provider
- **DELIVERED**: Confirmed delivery (when provider supports it)
- **FAILED**: Failed to send (SMTP errors, invalid addresses, etc.)
- **BOUNCED**: Email bounced back from recipient server

## Technical Implementation

### Backend Components

#### 1. Email Logger Utility (`email-logger.ts`)
```typescript
// Log email attempts
await logEmailAttempt({
  type: EmailType.INVITATION,
  recipient: 'user@example.com',
  subject: 'Welcome to IZI Wheel',
  companyId: 'company-123',
  userId: 'user-456'
});

// Update email status
await updateEmailStatus(emailId, EmailStatus.SENT, messageId);
```

#### 2. Enhanced Mailer (`mailer.ts`)
- Automatic logging integration
- Status tracking for all email types
- Error handling and retry logic
- Support for both SMTP.com API and traditional SMTP

#### 3. API Endpoints
- `GET /emails/stats` - Email statistics
- `GET /emails/logs` - Email logs with pagination
- `GET /emails/dashboard` - Combined dashboard data

### Frontend Components

#### 1. Email Tracking Page (`EmailTracking.tsx`)
- Real-time statistics dashboard
- Advanced filtering and search
- Detailed email logs table
- Export functionality

#### 2. Navigation Integration
- Added to admin sidebar
- Role-based access (ADMIN and SUPER only)
- Responsive design

## Database Schema

### EmailLog Table
```sql
CREATE TABLE EmailLog (
  id          String       @id @default(uuid())
  type        EmailType    -- INVITATION, PRIZE_NOTIFICATION, etc.
  recipient   String       -- Email address
  subject     String       -- Email subject
  status      EmailStatus  @default(PENDING)
  messageId   String?      -- Provider message ID
  errorMessage String?     -- Error details if failed
  sentAt      DateTime?    -- When successfully sent
  companyId   String?      -- Associated company
  playId      String?      -- Associated play (for prizes)
  userId      String?      -- Associated user (for invitations)
  metadata    Json?        -- Additional data
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
)
```

## Usage Examples

### 1. Accessing Email Tracking
1. Log in as ADMIN or SUPER user
2. Navigate to "E-mails" in the sidebar
3. View real-time statistics and logs

### 2. Filtering Email Logs
- **Search**: Type in recipient email or subject
- **Filter by Type**: Select specific email types
- **Filter by Status**: Show only failed, sent, or pending emails

### 3. Monitoring Email Health
- Check success rates in the statistics cards
- Review failed emails for common issues
- Monitor pending emails for delivery delays

## API Usage

### Get Email Statistics
```javascript
GET /emails/stats?companyId=optional-company-id

Response:
{
  "success": true,
  "data": {
    "total": 150,
    "sent": 145,
    "failed": 3,
    "pending": 2,
    "byType": {
      "INVITATION": 50,
      "PRIZE_NOTIFICATION": 80,
      "PASSWORD_RESET": 15,
      "WELCOME": 5,
      "NOTIFICATION": 0
    }
  }
}
```

### Get Email Logs
```javascript
GET /emails/logs?limit=50&offset=0&companyId=optional

Response:
{
  "success": true,
  "data": [
    {
      "id": "email-123",
      "type": "INVITATION",
      "recipient": "user@example.com",
      "subject": "Welcome to IZI Wheel",
      "status": "SENT",
      "messageId": "smtp-456",
      "sentAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-15T10:29:45Z",
      "company": { "name": "Company ABC" },
      "user": { "name": "John Doe", "email": "john@example.com" }
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

## Security & Privacy

### Access Control
- **Role-Based Access**: Only ADMIN and SUPER users can access email logs
- **Company Isolation**: Regular admins only see their company's emails
- **Super Admin Override**: SUPER users can view all company emails

### Data Protection
- **Sensitive Data Handling**: Email content is not stored, only metadata
- **Audit Compliance**: Complete audit trail for compliance requirements
- **Data Retention**: Configurable retention policies (future enhancement)

## Configuration

### Environment Variables
```env
# Email tracking is automatically enabled when mailer is configured
USE_SMTP_COM_API=true
SMTP_COM_API_KEY=your-api-key

# Traditional SMTP (fallback)
SMTP_HOST=smtp.example.com
SMTP_USER=your-username
SMTP_PASS=your-password
```

### Feature Flags
- Email tracking is enabled by default
- Can be disabled per environment if needed
- Graceful degradation when database is unavailable

## Troubleshooting

### Common Issues

#### 1. Emails Not Being Logged
- Check if email logger utility is imported correctly
- Verify database connection
- Check console logs for error messages

#### 2. Statistics Not Updating
- Refresh the dashboard page
- Check API endpoints are responding
- Verify user permissions

#### 3. Failed Email Status
- Review error messages in the logs
- Check SMTP configuration
- Verify recipient email addresses

### Debug Information
All email operations are logged to console with detailed information:
```
[EMAIL_LOG] 📝 Email logged: {id, type, recipient, subject, status}
[EMAIL_LOG] 🔄 Email status updated: {emailId, status, messageId}
[EMAIL_LOG] ❌ Failed to log email: {error details}
```

## Future Enhancements

### Planned Features
1. **Email Templates Management**: Visual template editor
2. **Delivery Analytics**: Open rates, click tracking
3. **Automated Retry Logic**: Smart retry for failed emails
4. **Notification Alerts**: Real-time alerts for delivery issues
5. **Bulk Operations**: Mass email management tools
6. **Advanced Reporting**: Detailed analytics and reports
7. **Email Scheduling**: Delayed and scheduled email sending

### Integration Opportunities
- **Webhook Integration**: Real-time delivery status updates
- **Third-party Analytics**: Integration with email analytics services
- **CRM Integration**: Sync with customer relationship management systems
- **Compliance Tools**: GDPR, CAN-SPAM compliance features

## Support

For issues or questions about the email tracking system:
1. Check the troubleshooting section above
2. Review console logs for detailed error information
3. Contact the development team with specific error messages

---

*This email tracking system provides complete visibility into your email operations, ensuring reliable delivery and comprehensive audit trails for your IZI Wheel application.* 