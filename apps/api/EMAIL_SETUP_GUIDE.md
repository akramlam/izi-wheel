# 📧 Email Setup Guide for IZI Wheel

## Current Status: SMTP Authentication Issues

Your SMTP.com configuration is failing with authentication error `535 5.7.8 Sorry.` 

## 🚀 Quick Fix Options

### Option 1: Gmail SMTP (RECOMMENDED - 5 minutes setup)

**Why Gmail?** Most reliable, free, and easy to configure.

**Steps:**
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to Google Account → Security → App passwords
   - Select "Mail" and generate a 16-character password
3. **Update .env file:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=abcd-efgh-ijkl-mnop  # 16-character app password
   EMAIL_FROM=noreply@izikado.fr
   ```

**Test command:**
```bash
node test-email-simple.js
```

### Option 2: Fix SMTP.com (Advanced)

**Possible Issues:**
1. **Wrong credentials** - Your password might be an API token, not account password
2. **Account not activated** - SMTP access might not be enabled
3. **Domain verification** - izikado.fr domain might need verification

**Solutions to try:**
1. **Check SMTP.com Dashboard:**
   - Login to smtp.com dashboard
   - Verify SMTP is enabled for your account
   - Check if you need to verify izikado.fr domain

2. **Try API instead of SMTP:**
   ```env
   USE_SMTP_COM_API=true
   SMTP_COM_API_KEY=your-api-key-here
   ```

3. **Alternative ports:**
   ```env
   SMTP_HOST=send.smtp.com
   SMTP_PORT=2525  # Try this port instead
   SMTP_SECURE=false
   ```

### Option 3: Development Mode (No setup required)

For testing only - emails are saved as HTML files:

```env
NODE_ENV=development
# Comment out all SMTP settings
```

Emails will be saved to `./emails/` folder.

## 🧪 Testing Commands

**Test SMTP Configuration:**
```bash
node test-email-simple.js
```

**Test Prize Email Function:**
```bash
node -e "
require('dotenv').config();
const { sendPrizeEmail } = require('./dist/utils/mailer.js');
sendPrizeEmail('test@example.com', 'Test Prize', '', '123456')
  .then(() => console.log('✅ Success'))
  .catch(err => console.error('❌ Failed:', err.message));
"
```

**Build and test API:**
```bash
npm run build
npm run dev
```

## 🔧 Current Configuration Status

**SMTP.com Issues:**
- Host: send.smtp.com ✅
- Port: 587 ✅  
- User: izikado@izikado.fr ✅
- Password: [HIDDEN] ❌ (Authentication failing)

**Authentication Error:** `535 5.7.8 Sorry.`
- This typically means wrong username/password combination
- SMTP.com might require API credentials instead of account password

## 📝 Next Steps

1. **Try Gmail SMTP** (fastest solution)
2. **Check SMTP.com dashboard** for correct credentials
3. **Contact SMTP.com support** if credentials are correct
4. **Use development mode** for immediate testing

## ⚠️ Common Issues

**Build Errors:** You have TypeScript errors related to `bannerImage` and `backgroundImage` properties. These are separate from email issues.

**Email Not Sending:** 
- Check logs for specific error messages
- Verify SMTP credentials in dashboard
- Test with Gmail first to isolate the issue

---

**Need help?** Run any of the test commands above and share the output. 