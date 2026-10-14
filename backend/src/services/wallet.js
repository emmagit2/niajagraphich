import { withTransaction, query } from '../db/pool.js';
import { AppError } from '../lib/errors.js';

export async function getWallet(userId) {
  const r = await query(`SELECT user_id,
    purchased_balance, bonus_balance, reserved_balance,
    purchased_balance + bonus_balance - reserved_balance AS available_balance
    FROM token_wallets WHERE user_id=$1`, [userId]);
  if (!r.rowCount) throw new AppError(404,'WALLET_NOT_FOUND','Token wallet not found.');
  return r.rows[0];
}

export async function grantTokens({ userId, tokens, type, eventKey, description, metadata = {}, bucket = 'bonus', client: outerClient = null }) {
  if (!Number.isSafeInteger(tokens) || tokens <= 0) throw new AppError(400,'INVALID_TOKEN_AMOUNT','Token amount must be a positive integer.');
  const run = async client => {
    const existing = await client.query('SELECT id FROM token_ledger WHERE event_key=$1', [eventKey]);
    if (existing.rowCount) return { duplicate: true };
    await client.query('SELECT user_id FROM token_wallets WHERE user_id=$1 FOR UPDATE', [userId]);
    const purchasedDelta = bucket === 'purchased' ? tokens : 0;
    const bonusDelta = bucket === 'bonus' ? tokens : 0;
    await client.query(`UPDATE token_wallets SET purchased_balance=purchased_balance+$2,
      bonus_balance=bonus_balance+$3, updated_at=now() WHERE user_id=$1`,
      [userId, purchasedDelta, bonusDelta]);
    await client.query(`INSERT INTO token_ledger(user_id,event_key,entry_type,purchased_delta,bonus_delta,description,metadata)
      VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [userId,eventKey,type,purchasedDelta,bonusDelta,description,JSON.stringify(metadata)]);
    return { duplicate: false };
  };
  return outerClient ? run(outerClient) : withTransaction(run);
}

export async function reserveTokens({ userId, generationId, tokens, operation, prompt, provider, model, settings, sourceAssetId = null }) {
  return withTransaction(async client => {
    const w = (await client.query('SELECT * FROM token_wallets WHERE user_id=$1 FOR UPDATE', [userId])).rows[0];
    if (!w) throw new AppError(404,'WALLET_NOT_FOUND','Token wallet not found.');
    const available = Number(w.purchased_balance) + Number(w.bonus_balance) - Number(w.reserved_balance);
    if (available < tokens) throw new AppError(402,'INSUFFICIENT_TOKENS','Not enough tokens. Please buy more tokens.', { required: tokens, available });
    // Respect credits already reserved by other in-flight generations.
    const reservedBuckets = (await client.query(`SELECT
      COALESCE(sum(reserved_purchased),0)::bigint AS purchased,
      COALESCE(sum(reserved_bonus),0)::bigint AS bonus
      FROM generations WHERE user_id=$1 AND status='processing'`, [userId])).rows[0];
    const bonusAvailable = Number(w.bonus_balance) - Number(reservedBuckets.bonus);
    const purchasedAvailable = Number(w.purchased_balance) - Number(reservedBuckets.purchased);
    const fromBonus = Math.min(Math.max(0, bonusAvailable), tokens);
    const fromPurchased = tokens - fromBonus;
    if (fromPurchased > purchasedAvailable) throw new AppError(402,'INSUFFICIENT_TOKENS','Not enough unreserved tokens. Please buy more tokens.');
    await client.query(`UPDATE token_wallets SET reserved_balance=reserved_balance+$2, updated_at=now() WHERE user_id=$1`, [userId,tokens]);
    await client.query(`INSERT INTO generations(id,user_id,operation,prompt,model_provider,model_name,settings,status,token_cost,reserved_purchased,reserved_bonus,source_asset_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,'processing',$8,$9,$10,$11)`,
      [generationId,userId,operation,prompt,provider,model,JSON.stringify(settings),tokens,fromPurchased,fromBonus,sourceAssetId]);
    await client.query(`INSERT INTO token_ledger(user_id,event_key,entry_type,reserved_delta,description,metadata)
      VALUES($1,$2,'generation_reserve',$3,$4,$5)`,
      [userId,`gen:${generationId}:reserve`,tokens,`Reserved ${tokens} tokens for generation`,JSON.stringify({generationId,operation})]);
    return { generationId, tokens, availableAfterReservation: available - tokens };
  });
}

export async function finalizeGeneration({ generationId, userId, assetId, providerRequestId = null, actualCostMinor = null }) {
  return withTransaction(async client => {
    const g = (await client.query('SELECT * FROM generations WHERE id=$1 AND user_id=$2 FOR UPDATE',[generationId,userId])).rows[0];
    if (!g) throw new AppError(404,'GENERATION_NOT_FOUND','Generation not found.');
    if (g.status === 'succeeded') return { duplicate: true };
    if (g.status !== 'processing') throw new AppError(409,'GENERATION_NOT_PROCESSING','Generation is not processing.');
    const reserved = Number(g.token_cost);
    await client.query(`UPDATE token_wallets SET
      purchased_balance=purchased_balance-$2,
      bonus_balance=bonus_balance-$3,
      reserved_balance=reserved_balance-$4,
      updated_at=now() WHERE user_id=$1`,
      [userId,Number(g.reserved_purchased),Number(g.reserved_bonus),reserved]);
    await client.query(`INSERT INTO token_ledger(user_id,event_key,entry_type,purchased_delta,bonus_delta,reserved_delta,description,metadata)
      VALUES($1,$2,'generation_charge',$3,$4,$5,$6,$7)`,
      [userId,`gen:${generationId}:charge`,-Number(g.reserved_purchased),-Number(g.reserved_bonus),-reserved,`Charged ${reserved} tokens for generation`,JSON.stringify({generationId})]);
    await client.query(`UPDATE generations SET status='succeeded',output_asset_id=$3,provider_request_id=$4,actual_cost_minor=$5,completed_at=now()
      WHERE id=$1 AND user_id=$2`,[generationId,userId,assetId,providerRequestId,actualCostMinor]);
    return { duplicate: false };
  });
}

export async function refundGeneration({ generationId, userId, errorCode, errorMessage }) {
  return withTransaction(async client => {
    const g = (await client.query('SELECT * FROM generations WHERE id=$1 AND user_id=$2 FOR UPDATE',[generationId,userId])).rows[0];
    if (!g) throw new AppError(404,'GENERATION_NOT_FOUND','Generation not found.');
    if (g.status === 'failed') return { duplicate: true };
    if (g.status === 'succeeded') throw new AppError(409,'GENERATION_ALREADY_CHARGED','A successful generation cannot be refunded by this operation.');
    await client.query(`UPDATE token_wallets SET reserved_balance=GREATEST(0,reserved_balance-$2),updated_at=now() WHERE user_id=$1`,
      [userId,Number(g.token_cost)]);
    await client.query(`INSERT INTO token_ledger(user_id,event_key,entry_type,reserved_delta,description,metadata)
      VALUES($1,$2,'generation_refund',$3,$4,$5)`,
      [userId,`gen:${generationId}:refund`,-Number(g.token_cost),`Released ${g.token_cost} reserved tokens after failed generation`,JSON.stringify({generationId,errorCode})]);
    await client.query(`UPDATE generations SET status='failed',error_code=$3,error_message=$4,completed_at=now()
      WHERE id=$1 AND user_id=$2`,[generationId,userId,errorCode || 'PROVIDER_ERROR',String(errorMessage || 'Generation failed').slice(0,500)]);
    return { duplicate: false };
  });
}
