# Base44 frontend integration notes

The frontend should use a single API helper and must never make direct calls to Google AI or Paystack with secret keys.

```js
const API_URL = import.meta.env.VITE_NAIJADESIGN_API_URL;

export async function apiRequest(path, { token, ...options } = {}) {
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error?.message || 'Request failed');
    error.status = response.status;
    error.code = body.error?.code;
    error.details = body.error?.details;
    throw error;
  }
  return body;
}
```

This is a generic helper. Adapt environment variable syntax and access-token retrieval to the existing Base44 project. Do not assume Base44 exposes a token accepted by this backend until issuer, audience and signature verification have been tested.

## Example calls

```js
const me = await apiRequest('/me', { token: accessToken });
const packages = await apiRequest('/token-packages', { token: accessToken });
const payment = await apiRequest('/payments/initialize', {
  token: accessToken,
  method: 'POST',
  body: JSON.stringify({ packageCode: 'starter' })
});
// Redirect to payment.authorizationUrl using the frontend's navigation mechanism.

const generated = await apiRequest('/generations', {
  token: accessToken,
  method: 'POST',
  body: JSON.stringify({
    prompt: 'Create a premium Instagram product advert...',
    operation: 'standard',
    settings: { aspectRatio: '1:1' }
  })
});
```
