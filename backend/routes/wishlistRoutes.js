import { Router } from 'express';
import {
  addWishlistItem,
  getWishlist,
  removeWishlistItem
} from '../controllers/wishlistController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(authenticate, authorize('buyer'));
router.get('/', asyncHandler(getWishlist));
router.post('/:productId', asyncHandler(addWishlistItem));
router.delete('/:productId', asyncHandler(removeWishlistItem));

export default router;
