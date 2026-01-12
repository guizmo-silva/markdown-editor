import express from 'express';
import { exportToHTML, exportToPDF } from '../controllers/export.controller.js';

const router = express.Router();

// Export to HTML
router.post('/html', exportToHTML);

// Export to PDF (Phase 2)
router.post('/pdf', exportToPDF);

export default router;
