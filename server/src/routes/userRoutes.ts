// job-app-automator/server/src/routes/userRoutes.ts
import { Router } from 'express';
import { uploadCv } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';
import { upload } from '../config/multerConfig';

const router = Router();

// @route   POST /api/users/cv
// @desc    Upload and parse user CV
// @access  Private
router.post('/cv', protect, upload.single('cv'), uploadCv);

export default router;