
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { config } from './config/env.js';
import { seedAdmin } from './data/seedAdmin.js';

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    console.log('MongoDB connected successfully');

    // Create default admin
    await seedAdmin();

    // Start Express server
    const server = app.listen(config.port, () => {
      console.log(`FarmLink API listening on port ${config.port}`);
    });
    server.on('error', (error) => {
      console.error(`FarmLink API failed to listen on port ${config.port}: ${error.message}`);
      process.exit(1);
    });

  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
};

startServer();
