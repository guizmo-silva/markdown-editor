import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import fileRoutes from './routes/file.routes.js';
import exportRoutes from './routes/export.routes.js';
import trashRoutes from './routes/trash.routes.js';
import { validateVolumes } from './services/volume.service.js';
import { cleanupExpired } from './services/trash.service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
// Allow any origin since this is a self-hosted app accessed via localhost/LAN.
// credentials: false — app has no cookies or auth tokens, so no CSRF risk.
app.use(cors({
  origin: true,
  credentials: false,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting: max 300 requests per minute per IP
app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}));

// Routes
app.use('/api/files', fileRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/trash', trashRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);

  // Multer file size limit exceeded
  if ((err as any).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'File too large. Maximum allowed size is 20MB.' });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Configured volumes:');
  validateVolumes();

  // Cleanup expired trash items on startup and every 6 hours
  cleanupExpired().catch(err => console.error('Trash cleanup error:', err));
  setInterval(() => {
    cleanupExpired().catch(err => console.error('Trash cleanup error:', err));
  }, 6 * 60 * 60 * 1000);
});
