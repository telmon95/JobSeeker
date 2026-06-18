import { Router } from 'express';
import {
  generateCoverLetter,
  applyToJob,
  getApplications,
} from '../controllers/applicationController';
import { protect } from '../middleware/authMiddleware';

const router = Router();
router.use(protect);

router.get('/', getApplications);
router.post('/generate-letter', generateCoverLetter);
router.post('/apply', applyToJob);
router.post('/auto-apply', applyToJob);

export default router;
