# 🔧 SMTP Authentication Fix Guide for IZI Wheel

## Issue Summary
Your application is experiencing SMTP authentication failures with error 535, causing emails (like prize notifications) to fail to send.

**Error:** `[SMTP] ❌ Authentication failed. Check credentials.`

## 🎯 Recommended Solutions (In Priority Order)

### Solution 1: Switch to SMTP.com API (RECOMMENDED ✅)

The most reliable solution is to use SMTP.com's REST API instead of traditional SMTP:

#### Step 1: Get Your API Key
1. Login to [SMTP.com Dashboard](https://www.smtp.com/)
2. Navigate to the **API** section
3. Generate a new API key
4. Copy the API key

#### Step 2: Update Environment Variables
Add these to your `.env` file in the `apps/api/` directory:

```bash
# SMTP.com API Configuration (RECOMMENDED)
USE_SMTP_COM_API=true
SMTP_COM_API_KEY=your-actual-api-key-here

# Email settings
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=IZI Wheel
```

#### Step 3: Test the Configuration
```bash
cd apps/api
node test-smtp-com.js
```

---

### Solution 2: Gmail SMTP (RELIABLE ALTERNATIVE)

If SMTP.com continues to have issues, Gmail SMTP is extremely reliable:

#### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**

#### Step 2: Generate App Password
1. Go to **Security** → **2-Step Verification** → **App passwords**
2. Select **Mail** and generate a new password
3. Copy the 16-character password

#### Step 3: Update Environment Variables
```bash
# Gmail SMTP Configuration
USE_SMTP_COM_API=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-16-character-app-password
EMAIL_FROM=your-gmail@gmail.com
```

---

### Solution 3: Fix SMTP.com Traditional Authentication

If you prefer to stick with SMTP.com traditional SMTP:

#### Step 1: Verify Account Status
- Check if your SMTP.com account is active
- Verify payment status and plan limits

#### Step 2: Reset SMTP Credentials
1. Login to SMTP.com dashboard
2. Generate new SMTP username/password
3. Update your `.env` file with new credentials

#### Step 3: Update Configuration
```bash
# SMTP.com Traditional Configuration
USE_SMTP_COM_API=false
SMTP_HOST=smtp.smtp.com
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
EMAIL_FROM=your-verified-email@domain.com
```

## 🧪 Testing Your Configuration

### Test SMTP.com API
```bash
cd apps/api
node test-smtp-com.js
```

### Test Traditional SMTP
```bash
cd apps/api
node test-smtp.js
```

### Test in Development
1. Start your API server:
   ```bash
   cd apps/api
   npm run dev
   ```

2. Try adding a sub-admin or spinning a wheel to trigger an email

## 🔍 Debugging Steps

### Check Current Configuration
Run this command to see your current email settings:
```bash
cd apps/api
node -e "
require('dotenv').config();
console.log('SMTP Config:');
console.log('HOST:', process.env.SMTP_HOST);
console.log('PORT:', process.env.SMTP_PORT);
console.log('USER:', process.env.SMTP_USER);
console.log('PASS:', process.env.SMTP_PASS ? '[SET]' : '[MISSING]');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
console.log('USE_API:', process.env.USE_SMTP_COM_API);
console.log('API_KEY:', process.env.SMTP_COM_API_KEY ? '[SET]' : '[MISSING]');
"
```

### Check Log Files
Look for these patterns in your application logs:
- `[SMTP] ❌ Authentication failed` - Credential issues
- `[SMTP] ❌ Connection failed` - Network/port issues
- `[EMAIL] ✅ Email sent successfully` - Working correctly

## 🚀 Quick Fix for Immediate Relief

For development/testing, the system automatically saves emails as HTML files when SMTP fails:

**Location:** `apps/api/emails/`

You can open these files in a browser to verify email content while fixing the SMTP issue.

## 📊 Error Code Reference

- **535**: Authentication failed - Invalid credentials
- **550**: Message rejected - Check email address validity
- **421**: Service temporarily unavailable
- **EAUTH**: Authentication error
- **ECONNECTION**: Connection failed - Port blocked
- **ETIMEDOUT**: Network timeout

## ✅ Verification Checklist

After implementing any solution:

- [ ] Test email sending with test script
- [ ] Try adding a sub-admin (triggers invitation email)
- [ ] Spin a wheel and win a prize (triggers prize email)
- [ ] Check application logs for success messages
- [ ] Verify emails are received (not in spam folder)

## 🆘 If All Solutions Fail

1. **Check your server's network configuration**
2. **Verify firewall settings** (ports 587, 465, 2525 should be open)
3. **Contact your hosting provider** about SMTP restrictions
4. **Consider using a different email service** (SendGrid, Mailgun, etc.)

---

**Need immediate help?** The application will continue to work but emails will be saved to files instead of being sent. Fix the SMTP configuration to restore email functionality.