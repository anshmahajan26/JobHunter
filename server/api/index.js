import app from '../src/app.js';
import { connectDB } from '../src/config/database.js';

// Vercel serverless entry point
export default async function handler(req, res) {
  await connectDB();
  return app(req, res);
}

