# Derbent

A derbent was a fortified pass — a narrow gate between worlds, guarded and deliberate.

This project carries that meaning forward.

Derbent stands at the boundary of your systems, verifying identity and granting passage.
Nothing enters without recognition. Nothing passes without consent.

## Project Overview

This project is a centralized Authentication & Authorization service built on **Cloudflare Workers**. It serves as the single source of truth for user identity across the `zerdalu.com` domain and its subdomains (e.g., `geveze.zerdalu.com`).

**Crucial Architecture Decisions:**

1.  **No JWTs:** We use **Opaque Tokens** (Random UUIDs).
2.  **Stateful Sessions:** Session data is stored in **Cloudflare KV**.
3.  **Root Domain Cookies:** Cookies are set on `.zerdalu.com` to allow cross-subdomain access.
4.  **Service Bindings:** Other Cloudflare Workers (`geveze`, `hodan`) communicate with this worker internally to verify sessions, avoiding public HTTP overhead.
5.  **App Isolation:** The system supports both Global SSO (`app_id=sso`) and App-Specific accounts (`app_id=geveze`).

## 1. Tech Stack & Requirements

- **Runtime:** Cloudflare Workers
- **Session Storage:** Cloudflare KV (Binding name: `KV`)
- **User Storage:** Cloudflare D1
- **Templating:** JS Template Literals (for Login/Register HTML forms)
- **Password Hashing:** Native **Web Crypto API** (PBKDF2-HMAC-SHA256).
  - _Format:_ Store as `salt_base64:hash_base64`.

## 2. Data Structures

### 1. The D1 Schema (`schema.sql`)

Here is the SQL to initialize your database.

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,                -- UUIDv7 or NanoID
    app TEXT NOT NULL,                  -- 'sso', 'geveze', 'hodan', etc.
    email TEXT NOT NULL,                --
    phash TEXT NOT NULL,                -- Password Hash - PBKDF2 (Web Crypto API)
    metadata TEXT DEFAULT '{}',         -- App-specific JSON data

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Allows same email for different apps, but only once per app.
CREATE UNIQUE INDEX idx_users_email_app ON users(email, app);

-- Fast lookup for emails across all apps
CREATE INDEX idx_users_email ON users(email);
```

### A. KV Session Schema

- **Key:** `<session_token>` (UUID v4)
- **Value:** JSON String
- **TTL:** 86400 seconds (24 hours)

```json
{
	"userId": "user_12345",
	"email": "alice@example.com",
	"role": "admin",
	"appId": "geveze", // or 'sso'
	"createdAt": 1700000000
}
```

### B. Cookie Specification

- **Name:** `session_<app_id>` (e.g., `session_geveze` or `session_sso`)
- **Domain:** `.zerdalu.com` (Note the leading dot)
- **Path:** `/`
- **Secure:** `true`
- **HttpOnly:** `true`
- **SameSite:** `Lax`

## 3. API Endpoints Specification

### Public Endpoints (Browser Facing)

#### `GET /login`

- **Query Params:**
  - `redirect` (string, URL encoded): URL to return to after success.
  - `app_id` (string, default='sso'): Context of the login.
- **Behavior:** Returns HTML string containing the login form. Form `action` must preserve query params.

#### `POST /login`

- **Body:** `FormData` (email, password).
- **Logic:**
  1.  Validate credentials against User DB.
  2.  Generate `sessionId = crypto.randomUUID()`.
  3.  Store session in `KV`.
  4.  Set `Set-Cookie` header.
  5.  Return `302 Found` redirecting to `redirect` param.

#### `GET /register`

- Similar logic to Login.

#### `POST /register`

1.  **Check for SSO:** Query `SELECT id FROM users WHERE email = ? AND app = 'sso'`.
    - If exists: Reject registration. "An SSO account already exists for this email."
2.  **Check for App Account:** If the user is registering for an app (e.g., `geveze`), check `SELECT id FROM users WHERE email = ? AND app = ?`.
    - If exists: Reject. "Account already exists for this app."
3.  **Check for Upgrade:** If registering for `sso`, check if any app-specific accounts exist for this email.
    - If exists: Reject registration. "An app-level account already exists for this email."
4.  **Hash Password:** Use `PBKDF2` via Web Crypto API with 100k+ iterations.
5.  **Insert:** Save to D1 and create KV session.

#### `GET /logout`

- **Logic:**
  1.  Parse cookie to get `sessionId`.
  2.  `await KV.delete(sessionId)`.
  3.  Expire the cookie (Max-Age=0).
  4.  Redirect to `redirect` param or root.

### Internal Endpoint (Service Binding Only)

#### `GET /verify`

- **Headers:** Must include the `Cookie` header from the original request.
- **Query Params:** `app_id` (The app requesting verification).
- **Logic:**
  1.  Extract `session_<app_id>` cookie value.
  2.  If missing, return `401`.
  3.  Look up value in `KV`.
  4.  If missing, return `401`.
  5.  **Authorization Check:** Ensure `session.appId` matches query param `app_id` (or session is `sso`).
  6.  If valid, return `200 OK` with JSON body of user details.

## 4. Account Type Logic (SSO vs. App-Level)

The Auth Worker must enforce the following business rules during **Registration**:

1.  **SSO Priority:** If a record exists with `email = 'user@email.com'` AND `app = 'sso'`, no other app-specific accounts can be created for that email. The user must use their SSO account.
2.  **App Isolation:** If no `sso` account exists, a user can have multiple records with the same email, provided the `app` value is different (e.g., one record for `geveze` and one for `hodan`).
3.  **Upgrade Path:** If a user has an app-specific account (e.g., `geveze`) and tries to register for `sso`, the system should prevent this (or handle migration) to ensure the `sso` "Global" rule remains intact.

## YAPMALI

1.
