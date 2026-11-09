import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jobpilot',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'jobpilot_fallback_secret_key_change_in_production_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',

  // Google Gemini AI
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.5-flash',

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  // Email
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT, 10) || 587,
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
  EMAIL_FROM: process.env.EMAIL_FROM || '"JobPilot AI" <noreply@jobpilot.ai>',

  // Defaults
  DEFAULT_MATCH_SCORE: parseInt(process.env.DEFAULT_MATCH_SCORE, 10) || 80,
  DEFAULT_DAILY_APPLICATION_LIMIT: parseInt(process.env.DEFAULT_DAILY_APPLICATION_LIMIT, 10) || 10,
  DEFAULT_POSTING_AGE_DAYS: parseInt(process.env.DEFAULT_POSTING_AGE_DAYS, 10) || 7,

  // Agent
  AGENT_TIMEZONE: process.env.AGENT_TIMEZONE || 'Asia/Kolkata',
  HEADLESS_BROWSER: process.env.HEADLESS_BROWSER !== 'false',
  ADMIN_SECRET: process.env.ADMIN_SECRET || 'jobpilot-admin',
  BROWSER_TIMEOUT_MS: parseInt(process.env.BROWSER_TIMEOUT_MS, 10) || 30000,
};

