# 🚀 Production .env Fix for SMTP.com API

## Issue Resolved ✅
The SMTP.com API format has been fixed in your code. Now you need **one small addition** to your production `.env` file.

## Required Change

**Add this single line to `/var/www/iziwheel/apps/api/.env`:**

```bash
EMAIL_FROM=contact@izitouch.fr
```

## Current vs Fixed Configuration

**Before (what you have now):**
```bash
USE_SMTP_COM_API=true
SMTP_COM_API_KEY=b189dca95e16d8d837af74e77d9294498938a34c
FROM_EMAIL="noreply@izikado.fr"  # ← Wrong variable name
EMAIL_FROM_NAME=IZI Wheel
```

**After (what you need):**
```bash
USE_SMTP_COM_API=true
SMTP_COM_API_KEY=b189dca95e16d8d837af74e77d9294498938a34c
FROM_EMAIL="noreply@izikado.fr"  # Keep this for other purposes
EMAIL_FROM=contact@izitouch.fr   # ← ADD THIS LINE
EMAIL_FROM_NAME=IZI Wheel
```

## Quick Commands

**1. SSH into your server:**
```bash
ssh ubuntu@your-server-ip
```

**2. Add the missing line:**
```bash
cd /var/www/iziwheel/apps/api
echo "EMAIL_FROM=contact@izitouch.fr" >> .env
```

**3. Test the fix:**
```bash
node test-smtp-api.js
```

**4. If test succeeds, restart your app:**
```bash
pm2 restart iziwheel
```

## What Was Fixed

✅ **Channel name**: Changed from `transactional` to `contact_izitouch_fr`  
✅ **Originator format**: Changed from object to simple string  
✅ **Recipients format**: Changed from object array to string array  
✅ **Body structure**: Added proper `body.parts` array with content types  

## Expected Result

After adding `EMAIL_FROM=contact@izitouch.fr`, you should see:
- ✅ Test passes with 200 OK response
- ✅ Prize emails send successfully  
- ✅ No more API format errors 