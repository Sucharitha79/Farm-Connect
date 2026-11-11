import { Router } from 'express';
import { getOrder, listMyOrders, updateOrderStatus } from '../controllers/orderController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(authenticate);
router.get('/mine', asyncHandler(listMyOrders));
router.get('/:id', asyncHandler(getOrder));
router.patch('/:id/status', asyncHandler(updateOrderStatus));

export default router;
