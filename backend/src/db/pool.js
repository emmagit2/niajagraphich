import pg from 'pg';
import { config } from '../config.js';
const { Pool } = pg;
if (!config.databaseUrl) {
  console.warn('DATABASE_URL is not configured. Database-dependent routes will not work.');
}
export const pool = new Pool({
  connectionString: config.databaseUrl || undefined,
  max: config.dbPoolMax,
  ssl: config.databaseSsl ? { rejectUnauthorized: true } : undefined,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});
pool.on('error', err => console.error('Unexpected PostgreSQL pool error', err.message));
export async function query(text, params) { return pool.query(text, params); }
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { client.release(); }
}
