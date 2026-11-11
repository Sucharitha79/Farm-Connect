import { Router } from 'express';
import {
  createProduce,
  deleteProduce,
  getProduce,
  listMyProduce,
  listProduce,
  updateProduce
} from '../controllers/produceController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.get('/', asyncHandler(listProduce));
router.get('/mine', authenticate, authorize('farmer'), asyncHandler(listMyProduce));
router.post('/', authenticate, authorize('farmer'), asyncHandler(createProduce));
router.get('/:id', asyncHandler(getProduce));
router.patch('/:id', authenticate, authorize('farmer'), asyncHandler(updateProduce));
router.delete('/:id', authenticate, authorize('farmer'), asyncHandler(deleteProduce));

export default router;
