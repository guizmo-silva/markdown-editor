import express from 'express';
import { exportToHTML, exportToPDF, exportDocumentWithImages } from '../controllers/export.controller.js';

const router = express.Router();

// Export to HTML
router.post('/html', exportToHTML);

// Export to PDF (Phase 2)
router.post('/pdf', exportToPDF);

// Export document with images as zip
router.post('/with-images', exportDocumentWithImages);

export default router;
