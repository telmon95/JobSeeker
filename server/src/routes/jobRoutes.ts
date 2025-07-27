// job-app-automator/server/src/routes/jobRoutes.ts
import { Router } from 'express';
import { getJobs, triggerScraping } from '../controllers/jobController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// All routes in this file are protected
router.use(protect);

router.get('/', getJobs);
router.post('/scrape', triggerScraping);

export default router;