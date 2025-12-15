import express from 'express';
import {
  generateRoomDescription,
  generateReviewResponse,
  generatePricingSuggestion,
  generateMarketingContent,
  generateSmartReplies,
  generateBookingSummary,
  generateBusinessInsights,
} from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All AI routes are protected and rate-limited
router.use(protect);
router.use(aiLimiter);

router.post('/room-description', generateRoomDescription);
router.post('/review-response', generateReviewResponse);
router.post('/pricing-suggestion', generatePricingSuggestion);
router.post('/marketing-content', generateMarketingContent);
router.post('/smart-replies', generateSmartReplies);
router.post('/booking-summary', generateBookingSummary);
router.post('/business-insights', generateBusinessInsights);

export default router;

