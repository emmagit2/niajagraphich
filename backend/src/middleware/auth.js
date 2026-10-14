import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../config.js';
import { query, withTransaction } from '../db/pool.js';
import { AppError } from '../lib/errors.js';

let jwks;
if (config.authJwksUrl) jwks = createRemoteJWKSet(new URL(config.authJwksUrl));

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token && config.nodeEnv !== 'production' && config.devAuthEnabled && req.headers['x-dev-user-id']) {
      req.user = await provisionUser({
        sub: String(req.headers['x-dev-user-id']),
        email: String(req.headers['x-dev-email'] || ''),
        name: String(req.headers['x-dev-name'] || ''),
        role: String(req.headers['x-dev-role'] || 'user')
      });
      return next();
    }
    if (!token || !jwks) throw new AppError(401, 'UNAUTHENTICATED', 'A valid Bearer token is required.');
    const verifyOptions = {};
    if (config.authIssuer) verifyOptions.issuer = config.authIssuer;
    if (config.authAudience) verifyOptions.audience = config.authAudience;
    const { payload } = await jwtVerify(token, jwks, verifyOptions);
    if (!payload.sub) throw new AppError(401, 'INVALID_TOKEN', 'Token is missing subject.');
    const role = String(payload[config.authRoleClaim] || payload.app_metadata?.role || 'user');
    req.user = await provisionUser({
      sub: String(payload.sub),
      email: typeof payload.email === 'string' ? payload.email : '',
      name: typeof payload.name === 'string' ? payload.name : '',
      role
    });
    if (req.user.status !== 'active') throw new AppError(403, 'ACCOUNT_UNAVAILABLE', 'This account is not active.');
    next();
  } catch (e) { next(e); }
}

async function provisionUser(claims) {
  return withTransaction(async client => {
    const role = ['admin','superadmin'].includes(claims.role) ? claims.role : 'user';
    let row = (await client.query('SELECT * FROM app_users WHERE auth_subject=$1 FOR UPDATE', [claims.sub])).rows[0];
    if (!row) {
      const code = `ND${cryptoRandomCode()}`;
      row = (await client.query(
        `INSERT INTO app_users(auth_subject,email,display_name,role,referral_code)
         VALUES($1,$2,$3,$4,$5) RETURNING *`,
        [claims.sub, claims.email || null, claims.name || null, role, code]
      )).rows[0];
      await client.query('INSERT INTO token_wallets(user_id) VALUES($1)', [row.id]);
      if (config.signupTokens > 0) {
        await client.query('UPDATE token_wallets SET bonus_balance=bonus_balance+$2 WHERE user_id=$1', [row.id, config.signupTokens]);
        await client.query(`INSERT INTO token_ledger(user_id,event_key,entry_type,bonus_delta,description,metadata)
          VALUES($1,$2,'signup_bonus',$3,$4,$5) ON CONFLICT(event_key) DO NOTHING`,
          [row.id, `signup:${row.id}:bonus`, config.signupTokens, 'Welcome bonus', JSON.stringify({ source: 'first_authenticated_session' })]);
      }
    } else {
      row = (await client.query(
        `UPDATE app_users SET email=COALESCE($2,email), display_name=COALESCE($3,display_name),
         updated_at=now() WHERE id=$1 RETURNING *`,
        [row.id, claims.email || null, claims.name || null]
      )).rows[0];
    }
    return row;
  });
}
function cryptoRandomCode() {
  return [...crypto.getRandomValues(new Uint8Array(6))].map(x => (x % 36).toString(36)).join('').toUpperCase();
}
export function requireAdmin(req,res,next) {
  if (!req.user || !config.adminRoles.includes(req.user.role)) return next(new AppError(403,'ADMIN_REQUIRED','Administrator access required.'));
  next();
}
