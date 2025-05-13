import { Router } from 'express';
import { authMiddleware, roleGuard } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';
import { 
  getCompanyUsers, 
  inviteUser, 
  updateUser, 
  deleteUser 
} from '../controllers/user.controller';

const router: Router = Router({ mergeParams: true });

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all users for a company (ADMIN+ only)
router.get('/', roleGuard([Role.ADMIN, Role.SUPER]), getCompanyUsers);

// Invite a new user to a company (ADMIN or SUPER)
router.post('/', roleGuard([Role.ADMIN, Role.SUPER]), inviteUser);

// Update a user's role or active status (ADMIN or SUPER)
router.put('/:uid', roleGuard([Role.ADMIN, Role.SUPER]), updateUser);

// Delete a user (ADMIN or SUPER)
router.delete('/:uid', roleGuard([Role.ADMIN, Role.SUPER]), deleteUser);

export default router; 