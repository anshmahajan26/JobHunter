import app from './app.js';
import { connectDB } from './config/database.js';
import { env } from './config/environment.js';
import { jobDiscoveryService } from './services/discovery/jobDiscoveryService.js';

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Ensure default company boards exist
    await jobDiscoveryService.seedDefaultBoards().catch((err) => {
      console.warn(`[Startup Warning] Board seeding: ${err.message}`);
    });

    const server = app.listen(env.PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 JobPilot AI Server running on port ${env.PORT}`);
      console.log(`🌍 Environment: ${env.NODE_ENV}`);
      console.log(`📡 Client URL: ${env.CLIENT_URL}`);
      console.log(`🤖 Gemini Model: ${env.GEMINI_MODEL}`);
      console.log(`===============================================`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('[Server] SIGTERM received. Shutting down gracefully.');
      server.close(() => process.exit(0));
    });
  } catch (err) {
    console.error(`[Server Startup Error] ${err.message}`);
  }
};

startServer();

