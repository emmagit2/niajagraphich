# NaijaDesign AI Backend

Standalone Node.js API for the existing NaijaDesign AI Base44 frontend. Includes PostgreSQL schema/migrations, configurable image providers (Gemini/OpenAI), Paystack payment initialization and verification, token ledger, referral rewards, private image storage, admin endpoints and tests.

## Important integration limitation

This repository is a backend implementation, not a deployed integration. The public Base44 URL does not expose the private project source or the JWT issuer/audience needed to verify the existing user's access tokens. Before connecting the frontend, configure `AUTH_JWKS_URL`, `AUTH_ISSUER`, and `AUTH_AUDIENCE` to match an identity token the Base44 frontend can securely provide. Do not accept arbitrary user IDs from the browser. If Base44 cannot issue a token verifiable by this API, add a trusted server-side identity bridge or move authentication to an identity provider shared by both apps.

## Requirements

- Node.js 20+
- PostgreSQL 14+
- Paystack account and secret key
- AI provider API key
- S3-compatible bucket for durable production image storage (recommended)

## Local setup

```bash
cp .env.example .env
# Edit .env with your database and provider credentials
docker compose up -d db
npm install
npm run migrate
npm run dev
```

Health check: `GET http://localhost:8080/api/health`

Run tests: `npm test`

## Authentication

All user endpoints require `Authorization: Bearer <JWT>`. The JWT must be issued by the configured identity provider and verified against `AUTH_JWKS_URL`, issuer and audience. The backend maps JWT `sub` to `app_users.auth_subject` and provisions a wallet on first authenticated request.

For local testing only, set `DEV_AUTH_ENABLED=true` and `NODE_ENV=development`, then send `X-Dev-User-Id: local-user-1` and optionally `X-Dev-Email`. Never enable this in production.

Admin role mapping comes from `AUTH_ROLE_CLAIM` and `AUTH_ADMIN_ROLES`. Do not trust a user-editable profile field to grant admin. Prefer server-managed claims or a separately controlled admin allowlist.

## Paystack

- Configure `PAYSTACK_SECRET_KEY` with a test key first.
- `POST /api/payments/initialize` with `{ "packageCode": "starter" }`.
- Complete the returned Paystack checkout URL.
- Paystack calls `POST /api/webhooks/paystack`.
- The API verifies the transaction with Paystack before crediting tokens.
- Set `PAYSTACK_CALLBACK_URL` to your Base44 payment result page.

Configure the webhook URL in Paystack as `https://YOUR_API_HOST/api/webhooks/paystack`. The webhook route uses the raw request body for signature verification.

## Image generation

Configure `AI_PROVIDER=gemini` and `GEMINI_API_KEY`, or `AI_PROVIDER=openai` and `OPENAI_API_KEY`. Provider-specific model names are configurable. Check the provider's current API model availability and terms before production deployment.

`POST /api/generations` expects:
```json
{
  "prompt": "Create a premium Instagram advert for a smart television...",
  "operation": "standard",
  "settings": { "aspectRatio": "1:1" }
}
```

For edit/variation operations, first upload a reference image with `POST /api/uploads` using `{ "mimeType": "image/png", "base64": "<base64 image bytes>" }`, then provide `sourceAssetId`.

## Main API

- `GET /api/health`
- `GET /api/me`
- `GET /api/wallet/ledger`
- `GET /api/token-packages`
- `POST /api/payments/initialize`
- `GET /api/payments/verify/:reference`
- `POST /api/generations`
- `GET /api/generations`
- `GET /api/generations/costs`
- `GET /api/designs`
- `DELETE /api/designs/:id`
- `GET /api/assets/:id`
- `POST /api/uploads`
- `GET /api/prompt-templates`
- `POST /api/referrals/attach` with `{ "code": "REFERRALCODE" }` (call after first login if a signup link contained a referral code)
- `GET /api/referrals`
- `GET /api/admin/overview` (admin)
- `GET /api/admin/packages` (admin)
- `PATCH /api/admin/packages/:code` (admin)
- `POST /api/admin/users/:id/adjust-tokens` (admin)
- `GET /api/admin/generations` (admin)
- `GET /api/admin/audit-logs` (admin)

## Base44 frontend connection

Set a frontend environment variable such as `NEXT_PUBLIC_NAIJADESIGN_API_URL` to the deployed API URL if your Base44 setup supports frontend environment variables. Add a small API client that:
1. Gets the signed-in user's valid access token using the configured auth integration.
2. Sends it as `Authorization: Bearer ...`.
3. Uses the endpoints listed above.
4. Handles 401, 402 insufficient tokens, 429 rate limits and generation progress.
5. Never sends provider secret keys or treats client-supplied token balances as authoritative.

The exact Base44 auth token integration must be confirmed in the existing project. Do not bypass it by sending only a user ID.

## Production checklist

- [ ] Configure a production PostgreSQL database and run migrations.
- [ ] Configure TLS and production CORS origins.
- [ ] Configure a verifiable identity issuer/JWKS/audience.
- [ ] Set strong secrets in deployment secret manager.
- [ ] Configure Paystack webhook and test real webhook delivery in test mode.
- [ ] Configure S3-compatible private storage and lifecycle/backup policy.
- [ ] Confirm model names, API pricing, quotas and image-edit support with provider docs.
- [ ] Set a timeout/job strategy appropriate to provider latency; long-running requests may need a queue/worker.
- [ ] Add monitoring, alerts, backups, retention rules and privacy/terms pages.
- [ ] Review refund, token expiration, referral and moderation policies.
- [ ] Run security review and end-to-end tests before accepting real payments.

## Known limitations requiring follow-up

1. Base44 identity integration needs issuer/JWKS/audience details or a trusted identity bridge.
2. Current generation route runs synchronously; production-scale usage should move provider work to a durable job queue.
3. Upload endpoint accepts base64 JSON, which is simple but less efficient than multipart or signed direct uploads for large images.
4. Image dimensions are not currently extracted; width/height remain nullable.
5. Local storage is for development only. Use private S3-compatible storage in production.
6. Provider API response schemas/model availability can change; verify against the selected model's current documentation.
7. Token operation costs and token package prices are examples and must be validated against real AI/provider/payment costs.
8. The admin role must be issued by trusted server-managed identity claims; never let users edit their own role.
9. Admin can update packages; token operation costs are currently environment-configured and should be moved into a guarded admin settings table before non-technical admin editing is required.
10. Signup bonus is granted idempotently when a new authenticated identity is first provisioned. Referral attachment is a separate authenticated endpoint; call it after first login when the frontend has captured a referral code.

## Security notes

This code is a strong implementation starter, not a security audit or a guarantee of production readiness. Have a developer review payment reconciliation, authentication claims, wallet invariants, privacy, provider API limits and operational monitoring before production use.
