import { Router } from 'express';
import {
  createEquipment,
  deleteEquipment,
  getEquipment,
  getMyBookings,
  getMyListings,
  listEquipment,
  updateEquipment
} from '../controllers/equipmentController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(authenticateToken);

router.get('/my-listings', authorizeRole('equipment_owner'), asyncHandler(getMyListings));
router.get('/my-bookings', authorizeRole('equipment_owner'), asyncHandler(getMyBookings));
router.post('/', authorizeRole('equipment_owner'), asyncHandler(createEquipment));
router.get('/', authorizeRole('farmer', 'equipment_owner', 'admin'), asyncHandler(listEquipment));
router.get('/:id', authorizeRole('farmer', 'equipment_owner', 'admin'), asyncHandler(getEquipment));
router.put('/:id', authorizeRole('equipment_owner'), asyncHandler(updateEquipment));
router.delete('/:id', authorizeRole('equipment_owner'), asyncHandler(deleteEquipment));

export default router;
