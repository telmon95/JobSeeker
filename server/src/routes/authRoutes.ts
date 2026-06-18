// job-app-automator/server/src/routes/authRoutes.ts
import { Router } from 'express';
import { registerUser, loginUser, resetPassword } from '../controllers/authController';

const router = Router();

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', registerUser);

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
router.post('/login', loginUser);

// @route   POST /api/auth/reset-password
// @desc    Reset password for an existing user
router.post('/reset-password', resetPassword);

export default router;