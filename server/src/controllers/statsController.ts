import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { getDashboardStats } from '../services/statsService';

export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getDashboardStats(req.user._id);
    res.status(200).json(stats);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Failed to load stats.', error: message });
  }
};
