import express from 'express';
import {
  approveHotel,
  approveUser,
  getPendingApprovals,
  getPlatformAnalytics,
  generateDemoData,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/pending-approvals', getPendingApprovals);
router.patch('/hotels/:id/approve', approveHotel);
router.patch('/users/:id/approve', approveUser);
router.get('/analytics', getPlatformAnalytics);
router.post('/generate-demo-data', generateDemoData);

export default router;

