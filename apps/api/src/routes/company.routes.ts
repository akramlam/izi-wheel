import { Router } from 'express';
import { authMiddleware, roleGuard } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';
import wheelRoutes from './wheel.routes';

// Add type annotation for router
const router: Router = Router();

// Apply authentication middleware to all company routes
router.use(authMiddleware);

// Nest wheel routes under company
router.use('/:companyId/wheels', wheelRoutes);

// TODO: Add company CRUD operations in future milestone

export default router; 