import express from 'express';
import {
  listFiles,
  readFile,
  saveFile,
  createFile,
  createFolder,
  deleteFile,
  renameFile,
  listVolumes,
  serveImage,
  importImage,
  upload,
} from '../controllers/file.controller.js';

const router = express.Router();

// List configured volumes
router.get('/volumes', listVolumes);

// List files in a directory
router.get('/list', listFiles);

// Read a file
router.get('/read', readFile);

// Serve image file
router.get('/image', serveImage);

// Save file
router.post('/save', saveFile);

// Create new file
router.post('/create', createFile);

// Create folder
router.post('/create-folder', createFolder);

// Import image into document folder
router.post('/import-image', upload.single('file'), importImage);

// Delete file
router.delete('/delete', deleteFile);

// Rename file
router.put('/rename', renameFile);

export default router;
