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

// Invite a new user to a company (ADMIN only)
router.post('/', roleGuard([Role.ADMIN]), inviteUser);

// Update a user's role or active status (ADMIN only)
router.put('/:uid', roleGuard([Role.ADMIN]), updateUser);

// Delete a user (ADMIN only)
router.delete('/:uid', roleGuard([Role.ADMIN]), deleteUser);

export default router; 