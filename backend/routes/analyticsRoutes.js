import { Router } from 'express';
import { getPriceAnalytics } from '../controllers/analyticsController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.get('/prices', asyncHandler(getPriceAnalytics));

export default router;
