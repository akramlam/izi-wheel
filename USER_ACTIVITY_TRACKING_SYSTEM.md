# User Activity Tracking & Traceability System

## Overview

The User Activity Tracking system provides comprehensive traceability of all user interactions, plays, and system activities in the IziWheel application. This system enables administrators to monitor user behavior, track play history, and maintain detailed audit logs for compliance and analytics purposes.

## Features

### 🎯 Complete Play History
- **Real-time tracking** of all wheel spins and results
- **Detailed user information** including name, email, IP address
- **Prize tracking** with PIN codes and redemption status
- **Temporal data** with precise timestamps for all activities

### 📊 Analytics Dashboard
- **Overview statistics** with key performance indicators
- **Play success rates** and conversion metrics
- **Top performing wheels** and engagement analytics
- **Real-time activity monitoring**

### 🔍 Advanced Filtering & Search
- **Search by user details** (name, email, PIN)
- **Filter by results** (wins/losses)
- **Filter by status** (pending/claimed/redeemed)
- **Date range filtering** for historical analysis

### 📤 Data Export & Compliance
- **CSV export** for Excel analysis
- **JSON export** for technical integration
- **Date range exports** for specific periods
- **Complete audit trail** for compliance requirements

## System Architecture

### Backend Components

#### Activity Logger (`activity-logger.ts`)
```typescript
// Core logging functions
logActivity(data: ActivityLogData)
logPlayActivity(playData)
logAuthActivity(type, userId, email, ipAddress)
logWheelActivity(type, wheelId, wheelName, companyId)
logEmailActivity(type, emailId, recipient, subject)
```

#### Activity Controller (`activity-tracking.controller.ts`)
```typescript
// API endpoints
GET /api/activity/dashboard     // Comprehensive dashboard data
GET /api/activity/plays         // Detailed play history with filtering
GET /api/activity/stats         // Activity statistics
GET /api/activity/export        // Data export functionality
```

#### Database Integration
- **Automatic logging** integrated into existing play creation flow
- **Non-blocking operation** - logging failures don't affect user experience
- **Metadata capture** including IP addresses, user agents, and request context

### Frontend Components

#### ActivityTracking Page (`ActivityTracking.tsx`)
- **Tabbed interface** with Dashboard, Play History, and Export sections
- **Real-time data** with automatic refresh capabilities
- **Responsive design** optimized for desktop and mobile
- **Interactive filtering** with immediate results

#### Navigation Integration
- **Sidebar menu item** "Traçabilité" for ADMIN and SUPER users
- **Route protection** ensuring only authorized users can access
- **Seamless integration** with existing authentication system

## Activity Types Tracked

### User Management Activities
- `USER_CREATED` - New user registration
- `USER_LOGIN` - User authentication
- `USER_LOGOUT` - User session termination
- `USER_PASSWORD_CHANGED` - Password updates
- `USER_INVITED` - Admin invitations sent
- `USER_ACTIVATED` / `USER_DEACTIVATED` - Account status changes

### Wheel & Play Activities
- `WHEEL_SPUN` - Every wheel spin attempt
- `PRIZE_WON` / `PRIZE_LOST` - Spin results
- `PRIZE_CLAIMED` - User provides contact information
- `PRIZE_REDEEMED` - Prize physically collected
- `WHEEL_CREATED` / `WHEEL_UPDATED` - Wheel management
- `WHEEL_ACTIVATED` / `WHEEL_DEACTIVATED` - Wheel status changes

### Email Activities
- `EMAIL_SENT` / `EMAIL_FAILED` - Email delivery tracking
- `EMAIL_OPENED` / `EMAIL_CLICKED` - Engagement tracking

### Security Activities
- `LOGIN_FAILED` - Failed authentication attempts
- `PASSWORD_RESET_REQUESTED` - Password reset requests
- `UNAUTHORIZED_ACCESS` - Security violations

## Data Structure

### Play Record Format
```typescript
interface PlayRecord {
  id: string;                    // Unique play identifier
  result: 'WIN' | 'LOSE';       // Spin outcome
  redemptionStatus: string;      // PENDING/CLAIMED/REDEEMED
  createdAt: string;            // Timestamp
  claimedAt?: string;           // When user provided info
  redeemedAt?: string;          // When prize was collected
  pin?: string;                 // Redemption PIN code
  ip?: string;                  // User's IP address
  wheel: {                      // Wheel information
    name: string;
    company: string;
  };
  slot: {                       // Prize information
    label: string;
    prizeCode?: string;
    color: string;
    isWinning: boolean;
  };
  leadInfo?: {                  // User contact information
    name?: string;
    email?: string;
    phone?: string;
  };
}
```

### Activity Log Format
```typescript
interface ActivityLogData {
  type: ActivityType;           // Activity classification
  severity: ActivitySeverity;   // LOW/MEDIUM/HIGH/CRITICAL
  description: string;          // Human-readable description
  userId?: string;              // Associated user
  companyId?: string;           // Associated company
  wheelId?: string;             // Associated wheel
  playId?: string;              // Associated play
  ipAddress?: string;           // Request IP
  userAgent?: string;           // Browser information
  metadata?: any;               // Additional context data
  timestamp: Date;              // When activity occurred
}
```

## API Endpoints

### Dashboard Data
```http
GET /api/activity/dashboard
```
Returns comprehensive dashboard with:
- Overview statistics (total plays, wins, claims, redemptions)
- Recent play activity
- Top performing wheels
- Success rates and conversion metrics

### Play History
```http
GET /api/activity/plays?limit=50&offset=0&search=email&result=WIN&status=CLAIMED
```
Parameters:
- `limit` - Number of records (default: 100)
- `offset` - Pagination offset (default: 0)
- `search` - Search in name, email, or PIN
- `result` - Filter by WIN or LOSE
- `status` - Filter by redemption status
- `wheelId` - Filter by specific wheel
- `companyId` - Filter by company (SUPER admin only)

### Data Export
```http
GET /api/activity/export?format=csv&startDate=2024-01-01&endDate=2024-12-31
```
Parameters:
- `format` - csv or json (default: json)
- `startDate` - Export start date (ISO format)
- `endDate` - Export end date (ISO format)
- `companyId` - Company filter (SUPER admin only)

## Security & Permissions

### Role-Based Access
- **SUPER admins**: Access to all companies and data
- **ADMIN users**: Access to their company's data only
- **SUB users**: No access to activity tracking

### Data Protection
- **IP address logging** for security and fraud detection
- **User agent tracking** for device and browser analytics
- **Secure export** with user authentication required
- **Audit trail** of who accessed what data when

## Usage Examples

### Monitoring User Engagement
1. Navigate to "Traçabilité" in the sidebar
2. View dashboard for quick overview of activity
3. Check recent plays for real-time monitoring
4. Analyze top performing wheels for optimization

### Investigating Specific Users
1. Go to "Historique des Parties" tab
2. Use search to find specific user by name or email
3. Review their complete play history
4. Check redemption status and timing

### Compliance Reporting
1. Access "Export de Données" tab
2. Set date range for reporting period
3. Choose CSV format for spreadsheet analysis
4. Export includes all required audit information

### Fraud Detection
1. Monitor for unusual IP patterns
2. Check for rapid successive plays
3. Review failed login attempts
4. Analyze redemption patterns

## Performance Considerations

### Logging Efficiency
- **Asynchronous logging** doesn't block user requests
- **Error handling** prevents logging failures from affecting user experience
- **Batch processing** for high-volume environments
- **Database indexing** on frequently queried fields

### Data Retention
- **Configurable retention periods** for different activity types
- **Automated cleanup** of old activity logs
- **Archival system** for long-term compliance needs
- **Export capabilities** before data deletion

## Integration Points

### Existing Systems
- **Play creation flow** automatically logs all spins
- **Email system** logs all sent/failed emails
- **Authentication system** tracks login/logout events
- **Wheel management** logs creation and updates

### Future Enhancements
- **Real-time notifications** for critical activities
- **Advanced analytics** with ML-powered insights
- **API webhooks** for external system integration
- **Custom reporting** with scheduled exports

## Troubleshooting

### Common Issues
1. **Missing activity logs**: Check database connectivity and error logs
2. **Slow dashboard loading**: Review database query performance
3. **Export failures**: Verify user permissions and date ranges
4. **Filter not working**: Check API parameter formatting

### Monitoring
- **Console logging** with severity-based formatting
- **Error tracking** for failed log attempts
- **Performance metrics** for API response times
- **User activity patterns** for system optimization

## Conclusion

The User Activity Tracking system provides comprehensive visibility into all user interactions within the IziWheel platform. This enables data-driven decision making, compliance with audit requirements, and enhanced security monitoring. The system is designed to be non-intrusive to user experience while providing maximum insight into platform usage and performance.

For technical support or feature requests, contact the development team with specific use cases and requirements. 