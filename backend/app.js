import cors from 'cors';
import express from 'express';
import { config } from './config/env.js';
import adminRoutes from './routes/adminRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import bidRoutes from './routes/bidRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import produceRoutes from './routes/produceRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import bookingRoutes from './routes/bookingRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import workerRoutes from './routes/workerRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';

const app = express();
const allowedOrigins = config.corsOrigin === '*'
  ? '*'
  : config.corsOrigin.split(',').map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/produce', produceRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
