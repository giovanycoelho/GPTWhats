import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { initializeDatabase } from './config/database.js';
// Restart server
import { rateLimiterMiddleware } from './middleware/rateLimiter.js';
import whatsappRoutes from './controllers/whatsappController.js';
import configRoutes from './controllers/configController.js';
import contactRoutes from './controllers/contactController.js';
import dashboardRoutes from './controllers/dashboardController.js';
import audioRoutes from './controllers/audioController.js';
import externalNotificationsRoutes from './routes/externalNotificationsRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || ["http://localhost:3000", "http://localhost:3002"],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || ["http://localhost:3000", "http://localhost:3002"],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(rateLimiterMiddleware);

// Initialize database
await initializeDatabase();

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/config', configRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/external-notifications', externalNotificationsRoutes);

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