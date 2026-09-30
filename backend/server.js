require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const emergencyRoutes = require('./routes/emergency');
const ambulanceRoutes = require('./routes/ambulance');
const hospitalRoutes = require('./routes/hospital');
const analyticsRoutes = require('./routes/analytics');
const medicalSchemesRoutes = require('./routes/medicalSchemes');
const postsRoutes = require('./routes/posts');
const insuranceRoutes = require('./routes/insurance');
const { initSockets } = require('./sockets');

const app = express();
const server = http.createServer(app);

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Make io accessible to routes
app.set('io', io);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.MAX_REQUESTS_PER_MINUTE) || 100,
  message: { success: false, message: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongoState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV,
    version: '3.0.0',
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/ambulance', ambulanceRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/medical-schemes', medicalSchemesRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/insurance', insuranceRoutes);

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const connectMongo = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('✅ MongoDB connected:', mongoose.connection.host);
      return;
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${i + 1}/${retries} failed:`, err.message);
      if (i < retries - 1) await new Promise(r => setTimeout(r, 3000));
    }
  }
  console.error('❌ Could not connect to MongoDB after', retries, 'attempts');
  process.exit(1);
};

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectMongo().then(() => {
  initSockets(io);
  server.listen(PORT, () => {
    console.log(`🚀 EmergencyAI Backend running on port ${PORT}`);
    console.log(`📡 Socket.IO ready`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
    console.log(`📖 Environment: ${process.env.NODE_ENV}`);
  });
});

module.exports = { app, io };
