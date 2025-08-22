import express from 'express';
import {
  getSettings,
  updateSettings,
  getRules,
  createRule,
  updateRule,
  deleteRule,
  toggleRule,
  getLogs
} from '../controllers/externalNotificationsController.js';

const router = express.Router();

// Settings routes
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Rules routes
router.get('/rules', getRules);
router.post('/rules', createRule);
router.put('/rules/:id', updateRule);
router.delete('/rules/:id', deleteRule);
router.patch('/rules/:id/toggle', toggleRule);

// Logs routes
router.get('/logs', getLogs);

export default router;