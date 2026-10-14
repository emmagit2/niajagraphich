import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { query, withTransaction } from '../db/pool.js';
import { grantTokens } from '../services/wallet.js';
import { AppError, asyncHandler } from '../lib/errors.js';

const router = Router();
router.use(authenticate,requireAdmin);
router.get('/admin/overview', asyncHandler(async (req,res) => {
  const [users,payments,gens,tokens] = await Promise.all([
    query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE created_at>now()-interval '24 hours')::int AS last_24h FROM app_users WHERE status<>'deleted'`),
    query(`SELECT count(*) FILTER(WHERE status='success')::int AS successful_count,COALESCE(sum(amount_kobo) FILTER(WHERE status='success'),0)::bigint AS revenue_kobo,count(*) FILTER(WHERE status='pending')::int AS pending_count FROM payments`),
    query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE status='succeeded')::int AS succeeded,count(*) FILTER(WHERE status='failed')::int AS failed,count(*) FILTER(WHERE created_at>now()-interval '24 hours')::int AS last_24h FROM generations`),
    query(`SELECT COALESCE(sum(-purchased_delta-bonus_delta) FILTER(WHERE entry_type='generation_charge'),0)::bigint AS charged_tokens FROM token_ledger`)
  ]);
  res.json({ users:users.rows[0],payments:payments.rows[0],generations:gens.rows[0],tokens:tokens.rows[0] });
}));
router.get('/admin/packages', asyncHandler(async (req,res) => {
  const r = await query('SELECT * FROM token_packages ORDER BY sort_order');
  res.json({ packages:r.rows });
}));
router.patch('/admin/packages/:code', asyncHandler(async (req,res) => {
  const parsed = z.object({ name:z.string().min(1).max(80).optional(), priceKobo:z.number().int().positive().optional(), tokens:z.number().int().positive().optional(), active:z.boolean().optional(), sortOrder:z.number().int().optional() }).safeParse(req.body);
  if (!parsed.success || !Object.keys(parsed.data || {}).length) throw new AppError(400,'INVALID_PACKAGE','Invalid package update.');
  const map = { name:'name',priceKobo:'price_kobo',tokens:'tokens',active:'active',sortOrder:'sort_order' };
  const keys = Object.keys(parsed.data);
  const values = keys.map(k => parsed.data[k]);
  const sets = keys.map((k,i)=>`${map[k]}=$${i+2}`);
  const r = await query(`UPDATE token_packages SET ${sets.join(',')},updated_at=now() WHERE code=$1 RETURNING *`,[req.params.code,...values]);
  if (!r.rowCount) throw new AppError(404,'PACKAGE_NOT_FOUND','Package not found.');
  await query('INSERT INTO audit_logs(actor_user_id,action,target_type,target_id,metadata) VALUES($1,$2,$3,$4,$5)',
    [req.user.id,'package.update','token_package',req.params.code,JSON.stringify(parsed.data)]);
  res.json({ package:r.rows[0] });
}));
router.post('/admin/users/:id/adjust-tokens', asyncHandler(async (req,res) => {
  const parsed = z.object({ tokens:z.number().int().min(-1000000).max(1000000).refine(n=>n!==0), bucket:z.enum(['purchased','bonus']), reason:z.string().min(5).max(500) }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400,'INVALID_ADJUSTMENT','Provide non-zero tokens, bucket and reason.');
  const { tokens,bucket,reason } = parsed.data;
  await withTransaction(async client => {
    const wallet = (await client.query('SELECT * FROM token_wallets WHERE user_id=$1 FOR UPDATE',[req.params.id])).rows[0];
    if (!wallet) throw new AppError(404,'USER_NOT_FOUND','User wallet not found.');
    const field = bucket === 'purchased' ? 'purchased_balance' : 'bonus_balance';
    if (Number(wallet[field]) + tokens < 0) throw new AppError(409,'NEGATIVE_BALANCE','Adjustment would make the wallet negative.');
    await client.query(`UPDATE token_wallets SET ${field}=${field}+$2,updated_at=now() WHERE user_id=$1`,[req.params.id,tokens]);
    await client.query(`INSERT INTO token_ledger(user_id,event_key,entry_type,purchased_delta,bonus_delta,description,metadata)
      VALUES($1,$2,'admin_adjustment',$3,$4,$5,$6)`,
      [req.params.id,`admin:${cryptoRandom()}`,bucket==='purchased'?tokens:0,bucket==='bonus'?tokens:0,reason,JSON.stringify({adminId:req.user.id,bucket})]);
    await client.query(`INSERT INTO audit_logs(actor_user_id,action,target_type,target_id,reason,metadata)
      VALUES($1,'wallet.adjust','user',$2,$3,$4)`,[req.user.id,req.params.id,reason,JSON.stringify({tokens,bucket})]);
  });
  res.json({ adjusted:true });
}));
router.get('/admin/generations', asyncHandler(async (req,res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 50),1),200);
  const r = await query(`SELECT id,user_id,operation,model_provider,model_name,status,token_cost,actual_cost_minor,error_code,created_at,completed_at
    FROM generations ORDER BY created_at DESC LIMIT $1`,[limit]);
  res.json({ generations:r.rows });
}));
router.get('/admin/audit-logs', asyncHandler(async (req,res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 50),1),200);
  const r = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1',[limit]);
  res.json({ logs:r.rows });
}));
function cryptoRandom(){ return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`; }
export default router;
