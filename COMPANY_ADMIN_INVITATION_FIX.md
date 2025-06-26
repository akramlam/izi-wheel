# Company Admin Invitation Fix

## Problem Description

When using the "Gestion des entreprises" (Company Management) page to add administrators to an existing company, the invitation emails were not being sent. Users could add admin details to the form, but no email invitations were generated.

## Root Cause

The issue was in the `updateCompany` controller function in `apps/api/src/controllers/company.controller.ts`. Unlike the `createCompany` function, the `updateCompany` function was not processing the `admins` array to create user accounts and send invitation emails.

### Before the Fix

```typescript
// updateCompany only handled company fields
const { name, plan, maxWheels, isActive } = req.body;
// No processing of admins array
```

### After the Fix

```typescript
// updateCompany now handles both company fields and admin invitations
const { name, plan, maxWheels, isActive, admins } = req.body;
// Full admin invitation processing added
```

## Solution Implemented

### 1. Updated `updateCompany` Function

The `updateCompany` function now includes the same admin invitation logic as `createCompany`:

- **Validates admins array**: Ensures it's a proper array if provided
- **Checks for existing users**: Skips invitation if user already exists
- **Creates new user accounts**: With temporary passwords and proper roles
- **Sends invitation emails**: Using the `sendInviteEmail` function
- **Returns admin count**: In the response for user feedback

### 2. Key Features Added

- ✅ **Email validation**: Skips users without email or role
- ✅ **Duplicate prevention**: Checks if user already exists before creating
- ✅ **Error handling**: Continues processing other admins if one fails
- ✅ **Logging**: Comprehensive console logs for debugging
- ✅ **Response feedback**: Returns count of successfully invited admins

### 3. API Response Format

```json
{
  "company": {
    "id": "company-id",
    "name": "Updated Company Name",
    "plan": "PREMIUM",
    "maxWheels": 10,
    "isActive": true
  },
  "admins": [
    {
      "id": "user-id-1",
      "name": "Admin Name",
      "email": "admin@example.com",
      "role": "ADMIN",
      "companyId": "company-id"
    }
  ]
}
```

## Testing the Fix

### Manual Testing

1. Navigate to **Entreprises** page in the dashboard
2. Click **Modifier** on any existing company
3. Click **Ajouter Admin** to add a new administrator
4. Fill in:
   - **Nom**: Administrator's name
   - **Email**: Administrator's email address
   - **Rôle**: ADMIN or SUB
5. Click **Mettre à jour**
6. Verify:
   - Success message shows "X admin(s) invité(s)"
   - Server logs show email sending
   - Email files generated in `./emails/` folder

### Automated Testing

Run the test script:
```bash
node test-company-admin-invitation.js
```

## Files Modified

1. **`apps/api/src/controllers/company.controller.ts`**
   - Updated `updateCompany` function to handle admin invitations
   - Added admin validation and creation logic
   - Added email invitation sending

## Email Integration

The fix uses the existing email infrastructure:

- **Email function**: `sendInviteEmail()` from `apps/api/src/utils/mailer.ts`
- **Email logging**: Integrated with the email tracking system
- **Templates**: Uses the same invitation email template as company creation
- **SMTP**: Works with the configured SMTP.com integration

## Success Indicators

When the fix is working correctly, you should see:

1. **Frontend**: Success toast showing "Entreprise mise à jour avec succès et X admin(s) invité(s)"
2. **Server logs**: 
   ```
   Processing X admin invitations for company update
   Sending invitation email to admin@example.com for company Company Name
   Successfully created and invited admin: admin@example.com
   Company update completed. Created X new admin(s)
   ```
3. **Email files**: New files in `./emails/` folder with invitation content
4. **Database**: New user records with `forcePasswordChange: true`

## Notes

- **Existing users**: If an admin email already exists in the system, the invitation is skipped
- **Error handling**: Individual admin invitation failures don't stop the company update
- **Security**: Generated temporary passwords are properly hashed
- **Consistency**: Uses the same invitation logic as company creation for reliability 