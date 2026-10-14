import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { query, withTransaction } from '../db/pool.js';
import { initializeTransaction, verifyTransaction, verifyWebhookSignature } from '../services/paystack.js';
import { grantTokens } from '../services/wallet.js';
import { qualifyReferralForPayment } from '../services/referrals.js';
import { config } from '../config.js';
import { AppError, asyncHandler } from '../lib/errors.js';

const router = Router();
router.get('/token-packages', asyncHandler(async (req,res) => {
  const r = await query('SELECT id,code,name,price_kobo,tokens,sort_order FROM token_packages WHERE active=true ORDER BY sort_order');
  res.json({ packages: r.rows.map(p => ({ ...p, priceNaira: Number(p.price_kobo)/100 })) });
}));
router.post('/payments/initialize', authenticate, asyncHandler(async (req,res) => {
  const parsed = z.object({ packageCode: z.string().min(1).max(50) }).safeParse(req.body);
  if (!parsed.success) throw new AppError(400,'INVALID_REQUEST','A valid packageCode is required.');
  const pkg = (await query('SELECT * FROM token_packages WHERE code=$1 AND active=true',[parsed.data.packageCode])).rows[0];
  if (!pkg) throw new AppError(404,'PACKAGE_NOT_FOUND','Token package not found.');
  if (!req.user.email) throw new AppError(400,'EMAIL_REQUIRED','Add and verify an email address before paying.');
  const reference = `nd_${crypto.randomUUID().replaceAll('-','')}`;
  const payment = (await query(`INSERT INTO payments(user_id,package_id,paystack_reference,amount_kobo,currency,metadata)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING id,paystack_reference,amount_kobo,currency`,
    [req.user.id,pkg.id,reference,pkg.price_kobo,config.paystackCurrency,JSON.stringify({packageCode:pkg.code,tokens:pkg.tokens})])).rows[0];
  try {
    const result = await initializeTransaction({
      email: req.user.email, reference, amountKobo: Number(pkg.price_kobo),
      callbackUrl: config.paystackCallbackUrl,
      metadata: { paymentId: payment.id, userId: req.user.id, packageCode: pkg.code }
    });
    res.json({ paymentId: payment.id, reference, authorizationUrl: result.authorization_url, accessCode: result.access_code });
  } catch (e) {
    await query("UPDATE payments SET status='failed',provider_status='initialization_failed',updated_at=now() WHERE id=$1",[payment.id]);
    throw e;
  }
}));
async function fulfillVerifiedPayment(reference) {
  const verified = await verifyTransaction(reference);
  if (verified.status !== 'success') throw new AppError(409,'PAYMENT_NOT_SUCCESSFUL','Payment has not succeeded.');
  return withTransaction(async client => {
    const p = (await client.query(`SELECT p.*,tp.tokens,tp.code AS package_code
      FROM payments p JOIN token_packages tp ON tp.id=p.package_id
      WHERE p.paystack_reference=$1 FOR UPDATE OF p`,[reference])).rows[0];
    if (!p) throw new AppError(404,'PAYMENT_NOT_FOUND','Payment reference not found.');
    if (verified.currency !== p.currency || Number(verified.amount) !== Number(p.amount_kobo)) {
      throw new AppError(409,'PAYMENT_MISMATCH','Verified payment amount or currency does not match the order.');
    }
    if (p.status === 'success' && p.credited_at) return { duplicate: true, status: 'success', paymentId: p.id, userId: p.user_id, amountKobo: Number(p.amount_kobo), tokens: Number(p.tokens) };
    await client.query(`UPDATE payments SET status='success',provider_status=$2,credited_at=now(),updated_at=now() WHERE id=$1`,
      [p.id,verified.gateway_response || 'success']);
    await grantTokens({
      userId: p.user_id, tokens: Number(p.tokens), type: 'purchase',
      eventKey: `payment:${p.paystack_reference}:credit`, description: `Purchased ${p.tokens} tokens`,
      metadata: { paymentId: p.id, reference, packageCode: p.package_code }, bucket: 'purchased', client
    });
    return { duplicate: false, status: 'success', paymentId: p.id, userId: p.user_id, amountKobo: Number(p.amount_kobo), tokens: Number(p.tokens) };
  });
}
router.get('/payments/verify/:reference', authenticate, asyncHandler(async (req,res) => {
  const local = (await query('SELECT user_id FROM payments WHERE paystack_reference=$1',[req.params.reference])).rows[0];
  if (!local || local.user_id !== req.user.id) throw new AppError(404,'PAYMENT_NOT_FOUND','Payment not found.');
  const result = await fulfillVerifiedPayment(req.params.reference);
  if (result.userId) await processReferralReward(result);
  res.json({ status: 'success', duplicate: result.duplicate || false });
}));
async function processReferralReward(result) {
  const { qualifyReferralForPayment } = await import('../services/referrals.js');
  await qualifyReferralForPayment({
    paymentId: result.paymentId, newUserId: result.userId, amountKobo: result.amountKobo,
    minPurchaseKobo: Number(process.env.REFERRAL_MIN_PURCHASE_KOBO || 100000),
    referrerTokens: Number(process.env.REFERRAL_REFERRER_TOKENS || 25),
    newUserTokens: Number(process.env.REFERRAL_NEW_USER_TOKENS || 10),
    maxRewards: Number(process.env.REFERRAL_REWARD_MAX_PER_USER || 100)
  });
}

export async function paystackWebhook(req,res,next) {
  let eventId = null;
  try {
    const signature = req.headers['x-paystack-signature'];
    if (!verifyWebhookSignature(req.body, signature)) return res.status(401).json({ error: 'Invalid webhook signature' });
    const event = JSON.parse(req.body.toString('utf8'));
    eventId = `${event.event}:${event.data?.reference || event.data?.id || 'unknown'}`;
    const inserted = await query(`INSERT INTO webhook_events(provider,event_id,event_type)
      VALUES('paystack',$1,$2) ON CONFLICT(provider,event_id) DO NOTHING RETURNING id`,[eventId,event.event || 'unknown']);
    if (!inserted.rowCount) {
      const existing = await query('SELECT processed_at FROM webhook_events WHERE provider=$1 AND event_id=$2',['paystack',eventId]);
      if (existing.rows[0]?.processed_at) return res.status(200).json({ received: true, duplicate: true });
      // An earlier delivery failed before completion. Delete the unprocessed marker so Paystack can retry.
      await query('DELETE FROM webhook_events WHERE provider=$1 AND event_id=$2 AND processed_at IS NULL',['paystack',eventId]);
      return res.status(503).json({ received: false, retry: true });
    }
    if (event.event === 'charge.success' && event.data?.reference) {
      const result = await fulfillVerifiedPayment(event.data.reference);
      if (result.userId) await processReferralReward(result);
    }
    await query('UPDATE webhook_events SET processed_at=now() WHERE id=$1',[inserted.rows[0].id]);
    return res.status(200).json({ received: true });
  } catch (e) {
    if (eventId) await query('DELETE FROM webhook_events WHERE provider=$1 AND event_id=$2 AND processed_at IS NULL',['paystack',eventId]).catch(() => {});
    next(e);
  }
}
export default router;
