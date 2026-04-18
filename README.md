# Derbent Auth Engine

Self-hosted authentication for Cloudflare Workers.

- Cross-subdomain SSO
- OAuth login (GitHub)
- Session-based auth (no JWTs)
- Session hijack protection
- Built using D1 + KV
- Audit logging

```text
User
  │
  ▼
App Worker ── Service Binding ──► Derbent Auth Worker
  │                                │
  │                                ├── KV (sessions)
  │                                └── D1 (users + audit logs)
  ▼
Cloudflare Cache
```

## Getting Started

You can deploy Derbent using the automated 1-click deploy button or manually via the CLI.

### Option 1: 1-Click Deploy (Recommended)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/medreseli/derbent)

The button above will automatically clone this repository to your GitHub account, provision your Cloudflare resources (KV, D1, Queues), run the required database migrations, and safely prompt you for the necessary environment variables.

_Once deployed, clone your new repository locally and proceed to **Step 3: Registering Your Apps** below to configure your allowed applications._

---

### Option 2: Manual Setup

#### 1. Setup

```bash
git clone https://github.com/medreseli/derbent.git
cd derbent
npm install
```

#### 2. Infrastructure Setup

You need to create your own Cloudflare resources for this instance:

1. **KV:** `npx wrangler kv namespace create KV`
2. **D1:** `npx wrangler d1 create db-derbent`
3. **Queue:** `npx wrangler queues create derbent-email-queue`
4. Paste the generated IDs into your `wrangler.jsonc`.

#### 3. Registering Your Apps

Derbent uses a strict whitelist to determine which apps are allowed to authenticate.
Open `src/config/apps.ts` and add your applications (e.g., `geveze`, `namedar`) to the `ALLOWED_APPS` array and `REGISTERED_APPS` object along with their production and development URLs.

#### 4. Environment Configuration

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

_Note for GitHub Login: You should create 2 OAuth apps in GitHub. One for local testing and the other for production. The Authorization callback URL format is `https://<your-domain>/auth/github/callback`. When you deploy your app, do not forget to use the production OAuth app's client ID and secret._

#### 5. Database

Prepare database:

```bash
npx wrangler d1 migrations apply db-derbent --local
```

#### 6. Run

Run locally:

```bash
npm run dev
```

---

## Integration for Consuming Apps

Derbent acts as a sidecar for your other services. Use **Service Bindings** to connect them without touching the public internet.

### 1. Wrangler Configuration

In your consuming app's `wrangler.jsonc`, add the service binding:

```jsonc
{
	"services": [
		{
			"binding": "DERBENT_SERVICE",
			"service": "derbent", // Name of the Derbent Worker
		},
	],
}
```

### 2. Verification Middleware

Every consuming app (e.g., `geveze`, `namedar`) should use the following pattern to verify users.
**Important:** You must pass the end-user's IP and User-Agent using the Derbent-Client-\* headers to maintain audit logging and session hijack protection.

```typescript
export async function verifyWithDerbent(c: Context, appId: string) {
	const cache = caches.default;
	const cookie = c.req.header('Cookie') || '';

	// If the cookie is empty, we can skip the fetch entirely to save CPU
	if (!cookie) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const clientIp = c.req.header('cf-connecting-ip') || '127.0.0.1';
	const clientUa = c.req.header('user-agent') || 'unknown';

	// SECURITY: Cloudflare Cache API ignores the 'Vary: Cookie' header.
	// To prevent cross-session leaking, we create a unique cache key by hashing the cookie.
	const encoder = new TextEncoder();
	const data = encoder.encode(cookie);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const cookieHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

	// PERFORMANCE: Use the consuming Worker's actual hostname to prevent DNS lookup penalties in the Cache API.
	const currentUrl = new URL(c.req.url);
	const cacheUrl = new URL(`${currentUrl.origin}/_internal_auth_cache`);
	cacheUrl.searchParams.set('app_id', appId);
	cacheUrl.searchParams.set('cookie_hash', cookieHash);
	const cacheKey = new Request(cacheUrl.toString());

	let response = await cache.match(cacheKey);

	if (!response) {
		// The actual request to Derbent via Service Binding.
		const fetchReq = new Request(`https://auth.internal/internal/verify?app_id=${appId}`, {
			headers: {
				Cookie: cookie,
				'Derbent-Client-IP': clientIp,
				'Derbent-Client-UA': clientUa,
			},
		});

		response = await c.env.DERBENT_SERVICE.fetch(fetchReq);

		if (response.ok) {
			// Cache the response against our unique cacheKey
			await cache.put(cacheKey, response.clone());
		}
	}

	return response;
}
```

_Note: Derbent sends `Vary: Cookie` and `Cache-Control: private, max-age=60` by default._

### 3. Internal API Reference

Consuming apps communicate with Derbent internally via Service Bindings.

#### `GET /internal/verify`

Verifies the session cookie and returns the user's session data.

**Request:**

- **Query:** `?app_id=your_app_id` (e.g., `hodan`, `sso`)
- **Headers:**
  - `Cookie`: The raw cookie string from the user's request.
  - `Derbent-Client-IP`: The user's IP (for hijack protection).
  - `Derbent-Client-UA`: The user's User-Agent (for hijack protection).

**Response (200 OK):**

```json
{
	"userId": "018f3a5b-7b2a-7c81-9d4f-123456789abc",
	"email": "user@example.com",
	"role": "user",
	"appId": "hodan",
	"createdAt": 1709654321000,
	"ip": "203.0.113.42",
	"userAgent": "Mozilla/5.0...",
	"tokenVersion": 1,
	"data": {} // Custom app-specific metadata
}
```

_Errors: Returns `401 Unauthorized` or `403 Forbidden` if the session is invalid, expired, or tied to a different IP/UA context._

#### `POST /internal/logout`

Destroys the current active session.

**Request:**

- **Query:** `?app_id=your_app_id`
- **Headers:** Same as `/internal/verify`

**Response (200 OK):**

```json
{
	"success": true
}
```

## Admin Dashboard API

Derbent exposes privileged endpoints to manage users and system security. These endpoints must be accessed with an `Authorization: Bearer <ADMIN_SECRET>` header.

### Users Management

| Endpoint                    | Method   | Description                                   |
| :-------------------------- | :------- | :-------------------------------------------- |
| `/admin/users`              | `GET`    | List users (`?page=1&limit=20&search=email@`) |
| `/admin/users/:id`          | `GET`    | Get a single user's detailed profile          |
| `/admin/users/:id`          | `PATCH`  | Update user metadata, app, or email status    |
| `/admin/users/:id/password` | `POST`   | Force reset a user's password                 |
| `/admin/users/:id/2fa`      | `DELETE` | Disable 2FA                                   |
| `/admin/users/:id`          | `DELETE` | Permanently delete a user & audit logs        |

### Admin Dashboard Secret

Generate admin dashboard secret with this command:

```bash
openssl rand -hex 32
```

#### For Local Development

```
ADMIN_SECRET=your_generated_hex_string_here
```

#### For Production

```bash
npx wrangler secret put ADMIN_SECRET
```

## Testing

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

---

## Use Cases

Derbent works well for:

• SaaS apps on Cloudflare Workers  
• Multi-subdomain applications  
• Edge-native APIs  
• Self-hosted authentication systems  
• Replacing Auth0 for Workers projects

## Assets

- Icon - https://www.svgrepo.com/svg/471884/shield-01
