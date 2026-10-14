import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import { config } from './config.js';
import { errorHandler, AppError } from './lib/errors.js';
import healthRoutes from './routes/health.js';
import meRoutes from './routes/me.js';
import paymentRoutes, { paystackWebhook } from './routes/payments.js';
import generationRoutes from './routes/generations.js';
import uploadRoutes from './routes/uploads.js';
import adminRoutes from './routes/admin.js';
import templateRoutes from './routes/templates.js';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((req,res,next)=>{ req.id = crypto.randomUUID(); res.setHeader('X-Request-Id',req.id); next(); });
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.frontendOrigins.includes(origin)) return callback(null,true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Request-Id']
}));
app.use('/api/webhooks/paystack', express.raw({ type:'application/json', limit:'1mb' }), paystackWebhook);
app.use(express.json({ limit:'15mb' }));
app.use(rateLimit({ windowMs:config.rateLimitWindowMs, max:config.rateLimitMax, standardHeaders:true, legacyHeaders:false }));
app.use('/api', healthRoutes);
app.use('/api', meRoutes);
app.use('/api', paymentRoutes);
app.use('/api', generationRoutes);
app.use('/api', uploadRoutes);
app.use('/api', adminRoutes);
app.use('/api', templateRoutes);
app.use((req,res,next)=>next(new AppError(404,'NOT_FOUND','Endpoint not found.')));
app.use(errorHandler);
