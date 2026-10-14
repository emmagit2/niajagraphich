import { withTransaction, query } from '../db/pool.js';
import { grantTokens } from './wallet.js';
import { AppError } from '../lib/errors.js';

export async function attachReferral({ newUserId, code }) {
  if (!code) return { attached: false };
  return withTransaction(async client => {
    const referrer = (await client.query('SELECT id FROM app_users WHERE referral_code=$1 AND status=$2',[code,'active'])).rows[0];
    if (!referrer || referrer.id === newUserId) return { attached: false };
    const user = (await client.query('SELECT referred_by FROM app_users WHERE id=$1 FOR UPDATE',[newUserId])).rows[0];
    if (!user || user.referred_by) return { attached: false };
    await client.query('UPDATE app_users SET referred_by=$2 WHERE id=$1',[newUserId,referrer.id]);
    await client.query(`INSERT INTO referrals(referrer_user_id,referred_user_id,referral_code,status)
      VALUES($1,$2,$3,'pending') ON CONFLICT(referred_user_id) DO NOTHING`,[referrer.id,newUserId,code]);
    return { attached: true };
  });
}

export async function qualifyReferralForPayment({ paymentId, newUserId, amountKobo, minPurchaseKobo, referrerTokens, newUserTokens, maxRewards }) {
  if (amountKobo < minPurchaseKobo) return { qualified: false };
  return withTransaction(async client => {
    const ref = (await client.query(`SELECT r.*, u.status AS referrer_status
      FROM referrals r JOIN app_users u ON u.id=r.referrer_user_id
      WHERE r.referred_user_id=$1 FOR UPDATE OF r`,[newUserId])).rows[0];
    if (!ref || ref.status === 'rewarded' || ref.status === 'rejected' || ref.referrer_status !== 'active') return { qualified: false };
    const count = await client.query(`SELECT count(*)::int AS n FROM referral_rewards WHERE beneficiary_user_id=$1 AND reward_type='referrer'`,[ref.referrer_user_id]);
    if (Number(count.rows[0].n) >= maxRewards) {
      await client.query(`UPDATE referrals SET status='rejected' WHERE id=$1`,[ref.id]);
      return { qualified: false, reason: 'reward_limit' };
    }
    await client.query(`UPDATE referrals SET status='qualified',qualifying_payment_id=$2,qualified_at=now() WHERE id=$1`,[ref.id,paymentId]);
    if (referrerTokens > 0) {
      await grantTokens({ userId: ref.referrer_user_id, tokens: referrerTokens, type: 'referral_reward',
        eventKey: `referral:${ref.id}:referrer`, description: 'Referral purchase reward', metadata: { referralId: ref.id }, bucket: 'bonus', client });
      await client.query(`INSERT INTO referral_rewards(referral_id,beneficiary_user_id,reward_type,tokens,event_key)
        VALUES($1,$2,'referrer',$3,$4) ON CONFLICT(event_key) DO NOTHING`,
        [ref.id,ref.referrer_user_id,referrerTokens,`referral:${ref.id}:referrer`]);
    }
    if (newUserTokens > 0) {
      await grantTokens({ userId: newUserId, tokens: newUserTokens, type: 'referral_reward',
        eventKey: `referral:${ref.id}:new-user`, description: 'Referral welcome reward', metadata: { referralId: ref.id }, bucket: 'bonus', client });
      await client.query(`INSERT INTO referral_rewards(referral_id,beneficiary_user_id,reward_type,tokens,event_key)
        VALUES($1,$2,'new_user',$3,$4) ON CONFLICT(event_key) DO NOTHING`,
        [ref.id,newUserId,newUserTokens,`referral:${ref.id}:new-user`]);
    }
    await client.query(`UPDATE referrals SET status='rewarded',rewarded_at=now() WHERE id=$1`,[ref.id]);
    return { qualified: true };
  });
}

export async function getReferralSummary(userId) {
  const code = await query('SELECT referral_code FROM app_users WHERE id=$1',[userId]);
  const stats = await query(`SELECT status,count(*)::int AS count FROM referrals WHERE referrer_user_id=$1 GROUP BY status`,[userId]);
  const rewards = await query(`SELECT COALESCE(sum(tokens),0)::bigint AS total_tokens FROM referral_rewards WHERE beneficiary_user_id=$1`,[userId]);
  return { referralCode: code.rows[0]?.referral_code, stats: stats.rows, totalRewardTokens: Number(rewards.rows[0]?.total_tokens || 0) };
}
