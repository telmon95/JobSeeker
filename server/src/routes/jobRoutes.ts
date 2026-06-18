import { Router } from 'express';
import { getJobs, getJobById, getJobFilters, getScrapeConfig, runJobPipeline, triggerScraping } from '../controllers/jobController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.get('/', getJobs);
router.get('/filters', getJobFilters);
router.get('/scrape/config', getScrapeConfig);
router.post('/scrape', triggerScraping);
router.post('/pipeline', runJobPipeline);
router.get('/:id', getJobById);

export default router;