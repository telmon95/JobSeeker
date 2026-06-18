import { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { uploadCv, getCurrentUser, updatePreferences } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';
import { upload } from '../config/multerConfig';

const router = Router();

const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.single('cv')(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'File upload failed.';
      return res.status(400).json({ message });
    }
    next();
  });
};

router.get('/me', protect, getCurrentUser);
router.patch('/preferences', protect, updatePreferences);
router.post('/cv', protect, handleUpload, uploadCv);

export default router;
