import { Router } from 'express';
import {
  deleteProduce,
  getAllBids,
  getAllOrders,
  getAllProduce,
  getDashboard,
  getUsers,
  setUserBlocked
} from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(authenticate, authorize('admin'));
router.get('/dashboard', asyncHandler(getDashboard));
router.get('/users', asyncHandler(getUsers));
router.patch('/users/:id/block', asyncHandler(setUserBlocked));
router.get('/produce', asyncHandler(getAllProduce));
router.delete('/produce/:id', asyncHandler(deleteProduce));
router.get('/bids', asyncHandler(getAllBids));
router.get('/orders', asyncHandler(getAllOrders));

export default router;
