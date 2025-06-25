# 🚨 URGENT: Invitation Email Fix Guide

## Problem Summary
- ✅ Prize emails are working correctly
- ❌ Invitation emails from sub-administrator management are not being sent
- 🔍 Root cause: SMTP configuration environment variables are not loaded in production

## Immediate Fix Steps

### 1. Check Production Environment Variables
SSH into your production server and verify the `.env` file:

```bash
# Check if .env file exists
ls -la /path/to/your/app/.env

# Check environment variables (without showing sensitive data)
cat .env | grep -E "SMTP|EMAIL" | sed 's/=.*/=***/'
```

### 2. Required Environment Variables
Ensure these variables are set in your production `.env` file:

```env
# SMTP Configuration
SMTP_HOST=send.smtp.com
SMTP_PORT=465
SMTP_USER=contact@izitouch.fr
SMTP_PASS=6xtBMyvt8M35W5
SMTP_SECURE=true

# Email Configuration
EMAIL_FROM=contact@izitouch.fr
EMAIL_FROM_NAME=IZI Wheel

# SMTP.com API Configuration
USE_SMTP_COM_API=true
SMTP_COM_API_KEY=b189dca95e16d8d837af74e77d9294498938a34c
```

### 3. Verify PM2 Environment Loading
Check if PM2 is loading the environment variables:

```bash
# Check PM2 environment
pm2 env iziwheel

# If environment variables are missing, restart with explicit env file
pm2 restart iziwheel --update-env

# Or reload with environment file
pm2 reload iziwheel --env production
```

### 4. Check Application Logs
Monitor the logs when sending an invitation:

```bash
# Watch logs in real-time
pm2 logs iziwheel --lines 50

# Look for these specific messages:
# - "SMTP configuration" messages
# - "Failed to send invitation email" errors
# - "Email sent successfully" confirmations
```

### 5. Test Email Configuration
Create a test script on the server to verify SMTP configuration:

```bash
# Create test-smtp-production.js on the server
node -e "
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER ? 'SET' : 'NOT SET');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
console.log('USE_SMTP_COM_API:', process.env.USE_SMTP_COM_API);
"
```

## Detailed Troubleshooting

### Issue 1: Environment Variables Not Loaded
**Symptoms:** SMTP_HOST and SMTP_PORT show as "not set"

**Solution:**
```bash
# 1. Check .env file location
find /path/to/app -name ".env" -type f

# 2. Verify .env file content
cat /path/to/app/.env | grep SMTP

# 3. Restart PM2 with environment
pm2 restart iziwheel --update-env
```

### Issue 2: SMTP.com API Not Working
**Symptoms:** API authentication errors in logs

**Solution:**
```bash
# 1. Test API key validity
curl -X GET "https://api.smtp.com/v4/channels" \
  -H "Authorization: Bearer b189dca95e16d8d837af74e77d9294498938a34c"

# 2. Verify channel name
# Should return "contact_izitouch_fr" channel
```

### Issue 3: Traditional SMTP Fallback Issues
**Symptoms:** SMTP connection timeouts or authentication failures

**Solution:**
```env
# Try different SMTP configuration
SMTP_HOST=send.smtp.com
SMTP_PORT=587
SMTP_SECURE=false
```

## Quick Fix Commands

Run these commands on your production server:

```bash
# 1. Navigate to app directory
cd /path/to/your/iziwheel/app

# 2. Check current environment
pm2 env iziwheel | grep -E "SMTP|EMAIL"

# 3. If variables are missing, ensure .env file has correct values
echo "Checking .env file..."
grep -E "SMTP|EMAIL" .env

# 4. Restart PM2 to reload environment
pm2 restart iziwheel

# 5. Test immediately by sending an invitation through the UI
echo "Now test sending an invitation email through the dashboard"
```

## Verification Steps

After applying the fix:

1. **Send Test Invitation:**
   - Go to Sub-administrators page
   - Create a new sub-administrator with email: iyebyi@gmail.com
   - Check if email is received

2. **Check Logs:**
   ```bash
   pm2 logs iziwheel --lines 20
   ```
   Look for:
   - ✅ "Invitation email sent to iyebyi@gmail.com"
   - ❌ "Failed to send invitation email"

3. **Verify Email Dashboard:**
   - Go to "E-mails" section in dashboard
   - Should show recent invitation emails
   - Check status (SENT vs FAILED)

## Emergency Fallback

If SMTP.com continues to fail, temporarily use Gmail SMTP:

```env
# Gmail SMTP Configuration (temporary)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
USE_SMTP_COM_API=false
EMAIL_FROM=your-gmail@gmail.com
```

## Root Cause Prevention

To prevent this issue in the future:

1. **Environment Variable Validation:**
   Add startup checks to verify all required environment variables are set

2. **Email Health Check:**
   Add an endpoint to test email configuration without sending actual emails

3. **Monitoring:**
   Set up alerts for email sending failures

4. **Documentation:**
   Keep environment variable requirements documented

## Expected Results

After applying the fix:
- ✅ Invitation emails should be sent successfully
- ✅ Email dashboard should show SENT status
- ✅ Recipients should receive invitation emails with temporary passwords
- ✅ Both prize emails and invitation emails should work consistently

## Support

If the issue persists after following these steps:
1. Check PM2 logs for specific error messages
2. Verify SMTP.com dashboard for delivery attempts
3. Test with a different email address
4. Contact SMTP.com support if API issues persist

---
**Priority:** URGENT - Affects user onboarding flow
**Impact:** High - Sub-administrators cannot be invited
**Estimated Fix Time:** 15-30 minutes 