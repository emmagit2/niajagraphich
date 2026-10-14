import { app } from './app.js';
import { config, assertProductionConfig } from './config.js';
import { pool } from './db/pool.js';
assertProductionConfig();
const server = app.listen(config.port, () => console.log(`NaijaDesign API listening on ${config.port}`));
async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => { await pool.end(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM',()=>shutdown('SIGTERM'));
process.on('SIGINT',()=>shutdown('SIGINT'));
