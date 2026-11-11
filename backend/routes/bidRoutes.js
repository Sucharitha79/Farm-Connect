import { Router } from 'express';
import {
  createBid,
  decideBid,
  listBidsForProduce,
  listMyBids,
  updateBid
} from '../controllers/bidController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(authenticate);
router.post('/', authorize('buyer'), asyncHandler(createBid));
router.get('/mine', authorize('buyer'), asyncHandler(listMyBids));
router.get('/produce/:produceId', authorize('farmer', 'admin'), asyncHandler(listBidsForProduce));
router.patch('/:id', authorize('buyer'), asyncHandler(updateBid));
router.patch('/:id/decision', authorize('farmer'), asyncHandler(decideBid));

export default router;
