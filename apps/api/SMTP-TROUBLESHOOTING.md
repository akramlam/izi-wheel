# 🔧 SMTP Troubleshooting Guide for IZI Wheel

## Current Issue: Authentication Error 535

**Status:** ❌ SMTP.com traditional authentication is failing with error `535 5.7.8 Sorry`

**Diagnosis:** Based on our tests and the troubleshooting guides from [LCN.com](https://www.lcn.com/support/articles/how-to-fix-issues-with-sending-email-smtp/), [Google](https://support.google.com/a/answer/3221692?hl=en), and [ServerSMTP.com](https://serversmtp.com/cannot-send-emails/), the issue is authentication-related.

## 🎯 Recommended Solutions (In Order of Priority)

### Solution 1: Use SMTP.com API (RECOMMENDED)

SMTP.com preferring API over traditional SMTP. Follow these steps:

1. **Login to SMTP.com Dashboard**
   - Go to https://www.smtp.com/
   - Login with your account credentials

2. **Generate API Key**
   - Navigate to API section in dashboard
   - Generate a new API key
   - Copy the key

3. **Update Configuration**
   ```bash
   # In apps/api/.env
   USE_SMTP_COM_API=true
   SMTP_COM_API_KEY=your-actual-api-key-here
   ```

4. **Test the API**
   ```bash
   cd apps/api
   node test-smtp.js
   ```

### Solution 2: Gmail SMTP (MOST RELIABLE ALTERNATIVE)

If SMTP.com continues to have issues, Gmail SMTP is extremely reliable:

1. **Enable 2-Factor Authentication**
   - Go to your Google Account settings
   - Security → 2-Step Verification → Turn On

2. **Generate App Password**
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and generate password
   - Copy the 16-character password

3. **Update Configuration**
   ```bash
   # In apps/api/.env
   USE_SMTP_COM_API=false
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-gmail@gmail.com
   SMTP_PASSWORD=your-16-character-app-password
   EMAIL_FROM=your-gmail@gmail.com
   ```

### Solution 3: Fix SMTP.com Traditional Authentication

If you prefer to stick with SMTP.com traditional SMTP:

1. **Verify Account Status**
   - Check if your SMTP.com account is active
   - Verify payment status if required

2. **Reset SMTP Password**
   - Login to SMTP.com dashboard
   - Generate new SMTP password
   - Update `.env` file with new password

3. **Check Domain/Email Verification**
   - Ensure `izikado@izikado.fr` is verified in SMTP.com
   - Verify domain ownership if required

## 🧪 Testing Commands

```bash
# Test current configuration
cd apps/api
node test-smtp.js

# Test email sending in development
npm run dev
# Then try adding a sub-admin to trigger invitation email
```

## 📊 Error Code Reference

Based on [Google's SMTP documentation](https://support.google.com/a/answer/3221692?hl=en):

- **535**: Authentication failed - Invalid credentials
- **550**: Message rejected as spam or invalid recipient
- **421**: Service temporarily unavailable
- **452**: Insufficient server storage

## 🔍 Current System Status

- ✅ Server hostname resolves (`send.smtp.com`)
- ✅ Network connectivity working
- ✅ All test ports accessible
- ❌ SMTP.com authentication failing
- ✅ Fallback to file transport working

## 🚀 Quick Fix for Development

For immediate testing, the system automatically falls back to saving emails as HTML files:

```bash
# Emails saved to: apps/api/emails/
# View them in browser to verify content
```

## 📞 Support Contacts

- **SMTP.com Support**: Check their knowledge base at the links you provided
- **Gmail Issues**: Google Workspace support
- **IZI Wheel**: Internal development team

## ⚡ Next Steps

1. **Immediate**: Try SMTP.com API configuration
2. **Backup**: Setup Gmail SMTP as fallback
3. **Long-term**: Contact SMTP.com support to fix traditional SMTP auth

---

*Last updated: Based on troubleshooting session with error 535 authentication failure* 