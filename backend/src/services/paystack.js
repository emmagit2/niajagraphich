import crypto from 'node:crypto';
import { config } from '../config.js';
import { AppError } from '../lib/errors.js';

async function paystackRequest(path, body = undefined) {
  if (!config.paystackSecretKey) throw new AppError(503,'PAYMENTS_NOT_CONFIGURED','Paystack is not configured.');
  const response = await fetch(`https://api.paystack.co${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${config.paystackSecretKey}`, 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status !== true) throw new AppError(502,'PAYSTACK_ERROR',data.message || 'Paystack request failed.');
  return data.data;
}
export async function initializeTransaction({ email, reference, amountKobo, metadata, callbackUrl }) {
  return paystackRequest('/transaction/initialize', {
    email, amount: String(amountKobo), currency: config.paystackCurrency, reference,
    callback_url: callbackUrl || config.paystackCallbackUrl || undefined,
    metadata
  });
}
export async function verifyTransaction(reference) {
  return paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
}
export function verifyWebhookSignature(rawBody, signature) {
  if (!config.paystackSecretKey || !signature) return false;
  const expected = crypto.createHmac('sha512', config.paystackSecretKey).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a,b);
}
