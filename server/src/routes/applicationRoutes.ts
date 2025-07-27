// job-app-automator/server/src/routes/applicationRoutes.ts
import { Router } from 'express';
import { generateCoverLetter } from '../controllers/applicationController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// All routes here are protected
router.use(protect);

router.post('/generate-letter', generateCoverLetter);

export default router;