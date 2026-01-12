import express from 'express';
import {
  listFiles,
  readFile,
  saveFile,
  createFile,
  deleteFile,
  renameFile
} from '../controllers/file.controller.js';

const router = express.Router();

// List files in a directory
router.get('/list', listFiles);

// Read a file
router.get('/read', readFile);

// Save file
router.post('/save', saveFile);

// Create new file
router.post('/create', createFile);

// Delete file
router.delete('/delete', deleteFile);

// Rename file
router.put('/rename', renameFile);

export default router;
