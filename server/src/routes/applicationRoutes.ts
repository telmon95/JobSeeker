import { Router } from 'express';
import { generateCoverLetter, autoApplyToJob } from '../controllers/applicationController';
import { protect } from '../middleware/authMiddleware';

const router = Router();
router.use(protect);

router.post('/generate-letter', generateCoverLetter);
router.post('/auto-apply', autoApplyToJob);

export default router;