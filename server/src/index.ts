// job-app-automator/server/src/index.ts

// THIS IS THE FIX. Load environment variables BEFORE any other code runs.
import dotenv from 'dotenv';
dotenv.config();

import dns from 'dns';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import jobRoutes from './routes/jobRoutes';
import applicationRoutes from './routes/applicationRoutes';
import statsRoutes from './routes/statsRoutes';

const app = express();
const PORT = process.env.PORT || 5001;

const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter((v): v is string => Boolean(v))
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin) || /\.vercel\.app$/i.test(origin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  throw new Error("FATAL ERROR: MONGO_URI is not defined in .env file.");
}

// Some routers fail to resolve MongoDB Atlas SRV records; public DNS is more reliable.
dns.setServers(['8.8.8.8', '1.1.1.1']);

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected successfully."))
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/stats', statsRoutes);

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).send({ status: 'healthy', message: 'Backend is up and running!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on http://localhost:${PORT}`);
});