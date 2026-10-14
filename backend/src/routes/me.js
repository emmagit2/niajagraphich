import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getWallet } from '../services/wallet.js';
import { attachReferral } from '../services/referrals.js';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { query } from '../db/pool.js';
const router = Router();
router.use(authenticate);
router.get('/me', async (req,res) => {
  const wallet = await getWallet(req.user.id);
  res.json({ user: { id: req.user.id, email: req.user.email, displayName: req.user.display_name, role: req.user.role }, wallet });
});
router.get('/wallet/ledger', async (req,res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 50),1),100);
  const r = await query(`SELECT id,entry_type,purchased_delta,bonus_delta,reserved_delta,description,metadata,created_at
    FROM token_ledger WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`,[req.user.id,limit]);
  res.json({ entries: r.rows });
});

router.post('/referrals/attach', async (req,res) => {
  const parsed = z.object({ code: z.string().trim().min(3).max(40) }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400,'INVALID_REFERRAL_CODE','Provide a valid referral code.');
  const result = await attachReferral({ newUserId: req.user.id, code: parsed.data.code });
  res.json(result);
});
router.get('/referrals', async (req,res) => {
  const { getReferralSummary } = await import('../services/referrals.js');
  res.json(await getReferralSummary(req.user.id));
});
export default router;
