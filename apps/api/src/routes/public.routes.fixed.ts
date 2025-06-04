import { Router, Request, Response, NextFunction } from 'express';
import { 
  getPublicWheel,
  spinWheel,
  getPrizeDetails,
  redeemPrize,
  debugPlayId
} from '../controllers/public.controller';

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
// For the 'company' path parameter, we'll still use getPublicWheel but handle it specially in the component
router.get('/company/:wheelId', getPublicWheel);
router.post('/company/:wheelId/spin', spinWheel);

// Fallback route for direct wheel access without company ID
router.get('/wheels/:wheelId', getPublicWheel);
// Fallback route for spinning wheels without company ID
router.post('/wheels/:wheelId/spin', spinWheel);

// Prize redemption endpoints
router.get('/plays/:playId', getPrizeDetails);
router.post('/plays/:playId/redeem', redeemPrize);

// Diagnostic endpoints
router.get('/debug/plays/:playId', debugPlayId);

export default router; 