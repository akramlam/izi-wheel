import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './utils/db';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import playRoutes from './routes/play.routes';

// Load environment variables
dotenv.config();

// Create Express app
export const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'IZI Wheel API' });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// API version
app.get('/version', (req, res) => {
  res.json({ version: '0.1.0' });
});

// Register API routes
app.use('/auth', authRoutes);
app.use('/companies', companyRoutes);
app.use('/plays', playRoutes);

// 404 Error handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server only if this file is run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
} 