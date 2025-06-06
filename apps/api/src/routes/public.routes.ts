import { Router, Request, Response, NextFunction } from 'express';
import { 
  getPublicWheel,
  spinWheel,
  getPrizeDetails,
  redeemPrize,
  claimPrize,
  debugPlayId,
  sendPrizeEmail
} from '../controllers/public.controller';

import {
  getCompanyWheel,
  spinCompanyWheel
} from '../controllers/company-wheel.controller';

const router: Router = Router();

// Middleware for debugging requests (optional)
const debugRequestMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
  }
  next();
};

// Public wheel endpoints
router.use(debugRequestMiddleware);
router.get('/companies/:companyId/wheels/:wheelId', getPublicWheel);
router.post('/companies/:companyId/wheels/:wheelId/spin', spinWheel);

// Special route for /company/:wheelId path pattern
// For the 'company' path parameter, we'll use the dedicated controller
router.get('/company/:wheelId', getCompanyWheel);
router.post('/company/:wheelId/spin', spinCompanyWheel);

// Fallback route for direct wheel access without company ID
router.get('/wheels/:wheelId', getPublicWheel);
// Fallback route for spinning wheels without company ID
router.post('/wheels/:wheelId/spin', spinWheel);

// Prize redemption endpoints
router.get('/plays/:playId', getPrizeDetails);
router.post('/plays/:playId/redeem', redeemPrize);
router.post('/plays/:playId/claim', claimPrize);

// Test email endpoint (development only)
router.post('/test-email', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Test endpoint not available in production' });
  }
  
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    console.log('Testing email send to:', email);
    await sendPrizeEmail(
      email,
      'Test Prize - ' + (name || 'Test User'),
      'https://example.com/test-qr',
      '123456'
    );
    
    res.json({ 
      success: true, 
      message: `Test email sent to ${email}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({ 
      error: 'Failed to send test email', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Diagnostic endpoints
router.get('/debug/plays/:playId', debugPlayId);

export default router; 