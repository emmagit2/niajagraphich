import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
function list(name, fallback = '') {
  return (process.env[name] ?? fallback).split(',').map(x => x.trim()).filter(Boolean);
}
export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8080),
  publicApiUrl: process.env.PUBLIC_API_URL || 'http://localhost:8080',
  frontendOrigins: list('FRONTEND_ORIGINS', 'http://localhost:3000'),
  databaseUrl: process.env.DATABASE_URL || '',
  databaseSsl: process.env.DATABASE_SSL === 'true',
  dbPoolMax: Number(process.env.DB_POOL_MAX || 10),
  authJwksUrl: process.env.AUTH_JWKS_URL || '',
  authIssuer: process.env.AUTH_ISSUER || '',
  authAudience: process.env.AUTH_AUDIENCE || '',
  authRoleClaim: process.env.AUTH_ROLE_CLAIM || 'role',
  adminRoles: list('AUTH_ADMIN_ROLES', 'admin,superadmin'),
  devAuthEnabled: process.env.DEV_AUTH_ENABLED === 'true',
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || '',
  paystackCurrency: process.env.PAYSTACK_CURRENCY || 'NGN',
  paystackCallbackUrl: process.env.PAYSTACK_CALLBACK_URL || '',
  paystackWebhookIpAllowlist: list('PAYSTACK_WEBHOOK_IP_ALLOWLIST'),
  aiProvider: process.env.AI_PROVIDER || 'gemini',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiImageModel: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
  aiRequestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS || 120000),
  aiMaxOutputBytes: Number(process.env.AI_MAX_OUTPUT_BYTES || 15000000),
  storageDriver: process.env.STORAGE_DRIVER || 'local',
  localStorageDir: process.env.LOCAL_STORAGE_DIR || './var/uploads',
  s3Bucket: process.env.S3_BUCKET || '',
  s3Region: process.env.S3_REGION || '',
  s3Endpoint: process.env.S3_ENDPOINT || '',
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || '',
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  signedUrlTtlSeconds: Number(process.env.SIGNED_URL_TTL_SECONDS || 900),
  signupTokens: Number(process.env.DEFAULT_SIGNUP_TOKENS || 10),
  maxPromptChars: Number(process.env.MAX_PROMPT_CHARS || 5000),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 10000000),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 30)
};
export function assertProductionConfig() {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is required');
  if (config.nodeEnv === 'production') {
    if (!config.authJwksUrl || !config.authIssuer || !config.authAudience) throw new Error('Production requires AUTH_JWKS_URL, AUTH_ISSUER and AUTH_AUDIENCE');
    if (config.devAuthEnabled) throw new Error('DEV_AUTH_ENABLED must be false in production');
    if (!config.paystackSecretKey) console.warn('PAYSTACK_SECRET_KEY not configured; payment endpoints will be unavailable');
    if (config.storageDriver === 'local') console.warn('Local storage is not durable across many container deployments; configure S3-compatible storage for production');
  }
}
