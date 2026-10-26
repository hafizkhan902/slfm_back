import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { connectDB } from './config/db.js';
import { seedDefaultAdmin } from './config/seed.js';
import { configureSanitization } from './middleware/sanitizeMiddleware.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import promoRoutes from './routes/promoRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import visitorRoutes from './routes/visitorRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import inquiryRoutes from './routes/inquiryRoutes.js';
import themeRoutes from './routes/themeRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import shareRoutes from './routes/shareRoutes.js';

// Load Environment Variables from server/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config(); // fallback default

// Connect to MongoDB Database & Seed Accounts
connectDB().then(() => {
  seedDefaultAdmin();
});

const app = express();

// 1. Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(compression());

// 2. Cross-Origin Resource Sharing (CORS) Policy
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// 3. Body Parsing & Input Sanitization (NoSQL Injection & XSS Shield)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
configureSanitization(app);

// 4. API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'ShahLajuk Furniture Mart API',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/admin/visitors', visitorRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/theme-section', themeRoutes);
app.use('/api/native-banner', bannerRoutes);
app.use('/api/shares', shareRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 5. Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

// 6. Start Server Listener with Port Conflict Fallback
const DEFAULT_PORT = process.env.PORT || 5005;

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`🚀 ShahLajuk Backend Server running on port ${port} [${process.env.NODE_ENV || 'development'}]`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} is occupied. Retrying on port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Server error:', err);
    }
  });
};

startServer(Number(DEFAULT_PORT));
