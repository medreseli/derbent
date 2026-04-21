# Derbent Auth Engine - Admin API Reference

This document serves as the definitive reference for the Derbent Auth Engine Admin API. It is optimized for AI assistants building consumer applications (like an Admin Dashboard) that will communicate with Derbent.

## 1. Communication & Authentication

All requests to the Admin API are protected and must be authenticated. How your app communicates with Derbent depends on the environment.

### 1.1 Requirements

- **Authentication:** Every request **MUST** include an `Authorization: Bearer <DERBENT_API_KEY>` header.
- **Production Routing:** Use Cloudflare Workers **Service Bindings** (`c.env.<BINDING_NAME>.fetch(req)`).
- **Local Development Routing:** Service Bindings do not easily bridge across separate local `wrangler dev` processes. For local development, send standard HTTP requests directly to Derbent running on `http://localhost:7777/admin`.

### 1.2 Example Fetch Wrapper (Dashboard Integration)

```typescript
async function fetchDerbentAdmin(c: Context, method: string, path: string, body?: any) {
	const isDev = c.env.APP_ENV === 'development';

	// In dev, hit the local Derbent instance. In prod, hit the internal Service Binding.
	const url = isDev ? `http://localhost:7777/admin${path}` : `https://auth.internal/admin${path}`;

	const req = new Request(url, {
		method,
		headers: {
			Authorization: `Bearer ${c.env.DERBENT_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: body ? JSON.stringify(body) : undefined,
	});

	// Use global fetch in Dev, Service Binding fetch in Prod
	const response = isDev ? await fetch(req) : await c.env.DERBENT_SERVICE.fetch(req);

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.error || `Admin API Error: ${response.status}`);
	}

	return response.json();
}
```

### 1.3 Standard Error Response Format

When a request fails (400, 401, 403, 404, 500), the API returns a JSON object:

```typescript
interface ErrorResponse {
	error: string;
	issues?: Array<{ message: string; path: any }>; // Present if it's a Validation error (Zod/Valibot)
}
```

---

## 2. Data Models

The following TypeScript interfaces describe the data returned by the API. _Note: Because Derbent uses Cloudflare D1 (SQLite), booleans are often represented as `0` (false) and `1` (true)._

```typescript
export interface DashboardStats {
	users: {
		total: number;
		newLast7Days: number;
		mfaEnabled: number;
		mfaPercentage: number;
		locked: number;
	};
	activity: {
		failedLogins24h: number;
		lockouts24h: number;
		pwdResets24h: number;
	};
	trends: {
		signups: Array<{ date: string; count: number }>;
		logins: Array<{ date: string; success: number; failed: number }>;
	};
}

export interface User {
	id: string; // UUIDv7
	app: string; // 'sso', 'hodan', 'namedar', etc.
	email: string;
	email_verified: 0 | 1; // 0 = False, 1 = True
	phash: string; // Opaque hash or 'OAUTH:GITHUB'/'OAUTH:GOOGLE'
	token_version: number; // Integer tracking session invalidations
	metadata: string; // JSON stringified object
	two_factor_secret: string | null;
	two_factor_enabled: 0 | 1; // 0 = False, 1 = True
	is_locked: 0 | 1; // 0 = False, 1 = True
	created_at: string; // ISO Date string
	updated_at: string; // ISO Date string
}

export interface AuditLogRecord {
	id: number;
	user_id: string | null; // Nullable (e.g., failed login for unknown user)
	action: string; // e.g., 'login_success', 'admin_update_user'
	email: string | null;
	ip: string | null;
	user_agent: string | null;
	details: string | null; // JSON stringified object containing extra context
	created_at: string; // ISO Date string
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
}
```

---

## 3. Endpoints

### 3.1 Get Dashboard Statistics

Retrieves aggregated system health, security posture metrics, and time-series trends for the main dashboard views.

- **Route:** `GET /admin/stats`
- **Query Parameters:** None
- **Response `200 OK`:** `DashboardStats`

### 3.2 Get Users

Lists users with optional pagination and search capabilities.

- **Route:** `GET /admin/users`
- **Query Parameters:**
  - `page` (optional, default: 1, min: 1)
  - `limit` (optional, default: 20, max: 100)
  - `search` (optional) - Searches by exact `id` or partial `email` (using `LIKE %search%`).
- **Response `200 OK`:** `PaginatedResponse<User>`

### 3.3 Get Single User

Retrieves a specific user by their ID.

- **Route:** `GET /admin/users/:id`
- **URL Parameters:**
  - `id`: The UUIDv7 of the user.
- **Response `200 OK`:** `User`
- **Response `404 Not Found`:** `{ "error": "User not found" }`

### 3.4 Update User

Updates basic attributes of a user.

- **Route:** `PATCH /admin/users/:id`
- **Body (JSON):**
  - `metadata` (optional, Record<string, any>) - Will be stringified before saving.
  - `email_verified` (optional, `0` or `1`)
  - `app` (optional, string)
- **Response `200 OK`:** `{ "success": true, "user": User }`
- **Response `400 Bad Request`:** Validation failed.
- **Response `404 Not Found`:** `{ "error": "User not found" }`

### 3.5 Force Reset Password

Overrides the user's current password. **Crucial:** This instantly revokes all active sessions for the user.

- **Route:** `POST /admin/users/:id/password`
- **Body (JSON):**
  - `newPassword` (string, required, minimum 8 characters)
- **Response `200 OK`:** `{ "success": true }`
- **Response `400 Bad Request`:** Validation failed, OR `{ "error": "Cannot reset password for OAuth-only accounts." }`
- **Response `404 Not Found`:** `{ "error": "User not found" }`

### 3.6 Disable 2FA

Turns off Two-Factor Authentication for a user.

- **Route:** `DELETE /admin/users/:id/2fa`
- **Body:** None
- **Response `200 OK`:** `{ "success": true }`
- **Response `400 Bad Request`:** `{ "error": "2FA is already disabled for this user." }`
- **Response `404 Not Found`:** `{ "error": "User not found" }`

### 3.7 Delete User

Permanently deletes a user, their sessions, and **all of their associated audit logs**.

- **Route:** `DELETE /admin/users/:id`
- **Body:** None
- **Response `200 OK`:** `{ "success": true }`
- **Response `404 Not Found`:** `{ "error": "User not found" }`

### 3.8 Revoke All Sessions

Forces a logout on all devices for the given user by clearing their token version in KV and incrementing it in D1.

- **Route:** `DELETE /admin/users/:id/sessions`
- **Body:** None
- **Response `200 OK`:** `{ "success": true }`
- **Response `404 Not Found`:** `{ "error": "User not found" }`

### 3.9 Lock / Unlock Account

Changes the lock status of an account. **Crucial:** Locking an account will immediately boot them out of all active sessions.

- **Route:** `POST /admin/users/:id/lock`
- **Body (JSON):**
  - `locked` (boolean, required) - `true` to lock, `false` to unlock. (The backend handles converting this boolean to `0` or `1` for the database).
- **Response `200 OK`:** `{ "success": true }`
- **Response `400 Bad Request`:** Validation failed.
- **Response `404 Not Found`:** `{ "error": "User not found" }`

### 3.10 Get Global Audit Logs

Retrieves a paginated list of all system audit logs.

- **Route:** `GET /admin/audit-logs`
- **Query Parameters:**
  - `page` (optional, default: 1, min: 1)
  - `limit` (optional, default: 50, max: 100)
  - `action` (optional) - Filter by specific action (e.g., `login_success`, `login_failed`, `admin_update_user`).
- **Response `200 OK`:** `PaginatedResponse<AuditLogRecord>`

### 3.11 Get User Audit Logs

Retrieves a paginated list of audit logs specifically tied to a given user ID.

- **Route:** `GET /admin/users/:id/audit-logs`
- **Query Parameters:**
  - `page` (optional, default: 1, min: 1)
  - `limit` (optional, default: 20, max: 100)
- **Response `200 OK`:** `PaginatedResponse<AuditLogRecord>`
- **Note:** Will return a successful empty pagination object (total: 0, data: []) if the user exists but has no logs, or if the user doesn't exist.
