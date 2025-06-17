# 🔧 Production SMTP Fix for IZI Wheel

## Current Status
Based on your production `.env` file, you have all the necessary credentials but are missing one key configuration flag.

## 🚀 IMMEDIATE FIX

Add this line to your `/var/www/iziwheel/apps/api/.env` file:

```bash
# Add this line to enable SMTP.com API
USE_SMTP_COM_API=true
```

Your current configuration:
- ✅ API Key: `SMTP_COM_API_KEY=b189dca95e16d8d837af74e77d9294498938a34c`
- ✅ SMTP Host: `send.smtp.com` (correct)
- ✅ SMTP Credentials: All present
- ❌ Missing: `USE_SMTP_COM_API=true`

## 📝 Complete Fixed Configuration

Replace your SMTP section in `/var/www/iziwheel/apps/api/.env` with:

```bash
# SMTP Configuration - MULTIPLE OPTIONS:

# OPTION 1: SMTP.com API (RECOMMENDED - More reliable than SMTP)
USE_SMTP_COM_API=true
SMTP_COM_API_KEY=b189dca95e16d8d837af74e77d9294498938a34c

# OPTION 2: Traditional SMTP (Fallback)
SMTP_HOST=send.smtp.com
SMTP_PORT=465
SMTP_ENCRYPTION=SSL
SMTP_SECURE=true
SMTP_USER=contact@izitouch.fr
SMTP_PASS=6xtBMyvt8M35W5

# Email settings
EMAIL_FROM=contact@izitouch.fr
EMAIL_FROM_NAME=IZI Wheel
FROM_EMAIL="noreply@izikado.fr"
```

## 🧪 Test Commands

Run these commands on your production server:

```bash
# 1. Navigate to API directory
cd /var/www/iziwheel/apps/api

# 2. Test SMTP.com API
node -e "
require('dotenv').config();
console.log('SMTP Config Check:');
console.log('USE_SMTP_COM_API:', process.env.USE_SMTP_COM_API);
console.log('API_KEY:', process.env.SMTP_COM_API_KEY ? 'SET' : 'MISSING');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
"

# 3. Test API connection
node test-smtp-api.js

# 4. Restart your application
pm2 restart iziwheel
# OR
npm run build && npm start
```

## 🎯 Expected Results

After adding `USE_SMTP_COM_API=true`:
- ✅ Prize emails will send successfully
- ✅ No more "Authentication failed" errors
- ✅ Emails will use the reliable SMTP.com API instead of traditional SMTP

## 🔄 If Still Not Working

If you still have issues, try this fallback configuration:

```bash
# Disable API and use traditional SMTP with correct settings
USE_SMTP_COM_API=false
SMTP_HOST=send.smtp.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=contact@izitouch.fr
SMTP_PASS=6xtBMyvt8M35W5
EMAIL_FROM=contact@izitouch.fr
```

## 🚨 Quick Action Items

1. **SSH into your production server**
2. **Edit `/var/www/iziwheel/apps/api/.env`**
3. **Add the line: `USE_SMTP_COM_API=true`**
4. **Restart your application**
5. **Test by spinning a wheel and winning a prize**

The fix is literally adding one line! Your SMTP.com API key is already valid and configured correctly. 