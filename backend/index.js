  import app from './app.js';
import { config } from './config/env.js';
import { seedAdmin } from './data/seedAdmin.js';

await seedAdmin();

app.listen(config.port, () => {
  console.log(`FarmLink API listening on port ${config.port}`);
});