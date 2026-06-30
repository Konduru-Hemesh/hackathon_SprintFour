import express from 'express';
import cors from 'cors';
import documentRoutes from './routes/documentRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for frontend cross-origin requests
app.use(cors({
  origin: '*', // For hackathon purposes, allow all origins
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Load endpoints under /api
app.use('/api', documentRoutes);

// Catch-all 404 for undefined routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Register global error handler middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[Conseal Backend] Running at http://localhost:${PORT}`);
});

export default app;
