import express from 'express';
import {
  getTrashItems,
  deleteTrashItem,
  restoreTrashItem,
  emptyTrashHandler,
} from '../controllers/trash.controller.js';

const router = express.Router();

// List trash items
router.get('/', getTrashItems);

// Empty trash
router.delete('/', emptyTrashHandler);

// Permanently delete a specific item
router.delete('/:id', deleteTrashItem);

// Restore a specific item
router.post('/:id/restore', restoreTrashItem);

export default router;
