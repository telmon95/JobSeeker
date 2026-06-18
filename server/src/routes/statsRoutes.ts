import { Router } from 'express';
import { getStats } from '../controllers/statsController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);
router.get('/', getStats);

export default router;
