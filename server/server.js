import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import initializeSocket from './sockets/index.js';
import authRoutes from './routes/authRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import { errorHandler } from './middlewares/errorMiddleware.js';
import { startOverdueTaskNotifier } from './services/overdueTaskNotifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const startServer = async () => {
  await connectDB();

  const app = express();
  const httpServer = createServer(app);

  const configuredOrigins = [
    process.env.CLIENT_URL,
    ...(process.env.CLIENT_URLS ? process.env.CLIENT_URLS.split(',') : []),
  ]
    .map((value) => `${value || ''}`.trim())
    .filter(Boolean);

  const localOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
  const allowedOrigins = [...new Set([...localOrigins, ...configuredOrigins])];

  const isAllowedOrigin = (origin = '') => {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;

    try {
      const { hostname } = new URL(origin);
      return hostname.endsWith('.vercel.app');
    } catch {
      return false;
    }
  };

  // Middleware
  app.use(cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS not allowed'));
    },
    credentials: true
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/files', fileRoutes);
  app.use('/api/activities', activityRoutes);
  app.use('/api/activity', activityRoutes);

  // Health check
  app.get('/health', (req, res) => res.send('OK'));

  // Error handling
  app.use(errorHandler);

  // Socket.io
  const io = initializeSocket(httpServer);
  app.set('io', io); // make io accessible in controllers if needed

  startOverdueTaskNotifier();

  const PORT = process.env.PORT || 5001;
  httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer();