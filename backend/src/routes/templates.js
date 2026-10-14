import { Router } from 'express';
import { query } from '../db/pool.js';
import { asyncHandler } from '../lib/errors.js';
const router = Router();
router.get('/prompt-templates', asyncHandler(async (req,res) => {
  const category = req.query.category ? String(req.query.category).slice(0,60) : null;
  const search = req.query.search ? String(req.query.search).slice(0,100) : null;
  const r = await query(`SELECT id,category,title,description,prompt,preview_url FROM prompt_templates
    WHERE active=true AND ($1::text IS NULL OR category=$1)
    AND ($2::text IS NULL OR title ILIKE '%'||$2||'%' OR description ILIKE '%'||$2||'%')
    ORDER BY category,title LIMIT 100`,[category,search]);
  res.json({ templates:r.rows });
}));
export default router;
