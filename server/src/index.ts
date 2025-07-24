import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/authRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Global Middleware
app.use(cors()); // Allow requests from the frontend
app.use(express.json()); // Allow server to accept JSON in request body
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// MongoDB Connection
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error("FATAL ERROR: MONGO_URI is not defined in .env file.");
  process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected successfully."))
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// --- API Routes ---
app.use('/api/auth', authRoutes);
// We will add actual routes later.

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).send({ status: 'healthy', message: 'Backend is up and running!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on http://localhost:${PORT}`);
});