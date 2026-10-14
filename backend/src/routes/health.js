import { Router } from 'express';
import { query } from '../db/pool.js';
const router = Router();
router.get('/health', async (req,res) => {
  let database = 'unknown';
  try { await query('SELECT 1'); database = 'ok'; } catch { database = 'unavailable'; }
  res.status(database === 'ok' ? 200 : 503).json({ status: database === 'ok' ? 'ok' : 'degraded', database, time: new Date().toISOString() });
});
export default router;
