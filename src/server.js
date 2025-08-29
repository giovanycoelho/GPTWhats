import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { initializeDatabase } from './config/database.js';
import healthCheckService from './utils/healthCheck.js';
// Restart server
import { rateLimiterMiddleware } from './middleware/rateLimiter.js';
import whatsappRoutes from './controllers/whatsappController.js';
import configRoutes from './controllers/configController.js';
import contactRoutes from './controllers/contactController.js';
import dashboardRoutes from './controllers/dashboardController.js';
import audioRoutes from './controllers/audioController.js';
import pendingMessagesRoutes from './controllers/pendingMessagesController.js';
import externalNotificationsRoutes from './routes/externalNotificationsRoutes.js';
import followupRoutes from './controllers/followupController.js';
import smartRecoveryRoutes from './controllers/smartRecoveryController.js';
import finalizationTestRoutes from './controllers/finalizationTestController.js';
import finalizationDebugController from './controllers/finalizationDebugController.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:5173"],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:5173"],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(rateLimiterMiddleware);

// Initialize database
await initializeDatabase();

// Routes - MUST be defined BEFORE static file middleware
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/config', configRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/pending', pendingMessagesRoutes);
app.use('/api/external-notifications', externalNotificationsRoutes);
app.use('/api/followup', followupRoutes);
app.use('/api/smart-recovery', smartRecoveryRoutes);
app.use('/api/finalization-test', finalizationTestRoutes);

// Finalization debug routes
app.get('/api/finalization/diagnostic/:phone', finalizationDebugController.getDiagnostic);
app.post('/api/finalization/reset/:phone', finalizationDebugController.resetFinalization);
app.get('/api/finalization/list-finalized', finalizationDebugController.listFinalized);
app.post('/api/finalization/reset-all', finalizationDebugController.resetAllFinalizations);

// Health check endpoint for 24/7 monitoring
app.get('/api/health', (req, res) => {
  try {
    const health = healthCheckService.getHealthStatus();
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      uptimeFormatted: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024)
      },
      lastHealthCheck: health,
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Always serve built React app for Electron
const clientBuildPath = path.join(__dirname, '../client/dist');
const hasBuiltFiles = fs.existsSync(clientBuildPath);

if (hasBuiltFiles) {
  console.log('📦 Serving built React app from:', clientBuildPath);
  app.use(express.static(clientBuildPath));
  
  // Handle React Router - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  console.log('⚠️ No built files found. Run: cd client && npm run build');
  console.log('📂 Serving development files from:', path.join(__dirname, '../client'));
  
  // Development mode - serve client files
  const clientPath = path.join(__dirname, '../client');
  app.use(express.static(clientPath, {
    setHeaders: (res, path) => {
      if (path.endsWith('.jsx') || path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));
  
  // Serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Global socket instance
global.io = io;

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 GPTWhats - WhatsApp AI Bot initialized`);
});

export { io };