import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import prisma from './utils/db';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import playRoutes from './routes/play.routes';
import userRoutes from './routes/user.routes';
import wheelRoutes from './routes/wheel.routes';
import publicRoutes from './routes/public.routes';

// Load environment variables
dotenv.config();

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IZI Wheel API',
      version: '0.1.0',
      description: 'IZI Wheel API documentation',
      contact: {
        name: 'API Support',
        email: 'support@iziwheel.com'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.iziwheel.com' 
          : `http://localhost:${process.env.PORT || 3001}`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Create Express app
export const app: Express = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'https://dashboard.izikado.fr',
    'https://roue.izikado.fr',
    'http://dashboard.izikado.fr',
    'http://roue.izikado.fr',
    'https://api.izikado.fr',
    'http://api.izikado.fr',
    'http://localhost:3000',
    'http://localhost:3010',
    'http://localhost:5173',
    'http://localhost:4173',
    'https://localhost:3000',
    'https://localhost:3010'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));
app.use(express.json());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'IZI Wheel API',
    documentation: `${req.protocol}://${req.get('host')}/api-docs`
  });
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
app.use('/users', userRoutes);
app.use('/plays', playRoutes);
app.use('/public', publicRoutes);
app.use('/wheels', wheelRoutes);

// Add direct access to wheels without requiring public/ prefix
app.use('/public/wheels', publicRoutes);

// 404 Error handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server only if this file is run directly
if (require.main === module) {
  const serverPort = Number(port);
  app.listen(serverPort, '0.0.0.0', () => {
    console.log(`Server running on port ${serverPort}`);
    console.log(`Server accessible at http://0.0.0.0:${serverPort}`);
    console.log(`API Documentation available at http://0.0.0.0:${serverPort}/api-docs`);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
} 
