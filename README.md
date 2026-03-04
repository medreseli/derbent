# Derbent Auth Engine

Derbent is a self-hosted, lightweight Authentication & Authorization service built for Cloudflare Workers, D1, and KV. Designed to be your own private identity gatekeeper.

## Getting Started

### 1. Setup

```bash
git clone https://github.com/medreseli/derbent.git
cd derbent
npm install
```

### 2. Infrastructure Setup

You need to create your own Cloudflare resources for this instance:

1. **KV:** `npx wrangler kv namespace create DERBENT_KV`
2. **D1:** `npx wrangler d1 create derbent-db`
3. Paste the generated IDs into your `wrangler.jsonc`.

### 3. Environment Configuration

Create a `.dev.vars` file for development. For production, use `wrangler secret`.

```env
# APP_ENV: 'development' or 'production'
APP_ENV=development
LOG_LEVEL=debug
APP_NAME=Derbent Auth
COOKIE_DOMAIN=localhost
BASE_URL=http://localhost:8787
RESEND_API_KEY=re_your_api_key_here
RESEND_DOMAIN=your-verified-domain.com
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### 4. Database

Prepare database:

```bash
npx wrangler d1 migrations apply db-derbent --local
```

### 5. Run

Run locally:

```bash
npm run dev
```

---

## Integration for Consuming Apps

Derbent acts as a sidecar for your other services. Use **Service Bindings** in `wrangler.jsonc` to connect them.

### Verification Middleware

Every consuming app (e.g., `geveze`) should use the following pattern to verify users.
**Important:** You must pass the end-user's IP and User-Agent using the Derbent-Client-\* headers to maintain audit logging and session hijack protection.

```typescript
export async function verifyWithDerbent(c: Context, appId: string) {
	const cache = caches.default;
	const cookie = c.req.header('Cookie') || '';

	// If the cookie is empty, we can skip the fetch entirely to save CPU
	if (!cookie) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	// Capture end-user context to pass to Derbent
	const clientIp = c.req.header('cf-connecting-ip') || '127.0.0.1';
	const clientUa = c.req.header('user-agent') || 'unknown';

	const cacheKey = new Request(`https://auth.internal/verify?app_id=${appId}`, {
		headers: {
			Cookie: cookie,
			'Derbent-Client-IP': clientIp,
			'Derbent-Client-UA': clientUa,
		},
	});

	let response = await cache.match(cacheKey);
	if (!response) {
		// Fetch from Derbent via Service Binding
		response = await c.env.DERBENT_SERVICE.fetch(cacheKey);
		if (response.ok) await cache.put(cacheKey, response.clone());
	}
	return response;
}
```

_Note: Derbent sends `Vary: Cookie` and `Cache-Control: private, max-age=60` by default._

---

## 🧪 Testing

```bash
npm run test
```

---

## Architecture & Decisions

- **No JWTs:** Opaque tokens only.
- **Stateful:** Session data stored in **Cloudflare KV**.
- **Root Domain Cookies:** Scoped to `.yourdomain.com` for cross-subdomain SSO.
- **Isolation:** Supports both Global `sso` accounts and app-specific accounts.

---

## Security & Business Logic

1. **SSO Priority:** Once an `sso` account exists for an email, app-specific accounts for that email cannot be created.
2. **Rate Limiting:** Protects against brute force.
3. **Audit Logging:** Every action is recorded in the D1 `audit_logs` table.
4. **Hijack Prevention:** Sessions are bound to `User-Agent` and `IP`.
