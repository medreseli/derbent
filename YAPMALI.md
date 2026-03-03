# OKU

- https://chatgpt.com/c/69a2c3d6-d8a8-8331-9f41-1446bce4f789
- https://chatgpt.com/c/69a17e65-3e50-8327-869b-7b8ffb484780

# YAP

- **Session Revocation:** Right now, users can log out of their _current_ session. But what if they want to "Log out of all devices"? You need a way to track which sessions belong to which user. You could store a list of active `sessionId`s in the user's D1 `metadata` or use KV prefixes to find and delete them.
- **OAuth / Social Login:** Adding "Login with GitHub" or "Login with Google" would make this a true SSO provider. You would handle the OAuth callback and map the social email to your `users` table.

- **The "Log Out Everywhere" Problem:** Right now, a user's session is stored in KV as `sessionId -> SessionData`. If a user gets hacked and resets their password, you have no way to find and delete their active sessions because you don't know their `sessionId`s.
  - _Fix:_ In your D1 `users` table, add a `version` integer. Put that same `version` in the KV session. If a user resets a password, increment `version` in D1. In your `/verify` endpoint, check if the Session's version matches the D1 version. (Alternatively, maintain a list of active `sessionId`s in the user's D1 `metadata`).
- **Caching Verification:** Your service bindings hit `/verify` on every request. This is fast on Cloudflare, but costs CPU time.
  - _Fix:_ The app consuming the verification (e.g., `geveze`) should cache the validation result in memory for 1-5 minutes to reduce load on Derbent.

- **Audit Logs:** Add an `audit_logs` table to D1. Every time a user logs in, fails a login, or resets a password, write a row: `(user_id, action, ip_address, timestamp)`. This is highly requested in B2B apps.

---

**3. No "Log Out Everywhere" / Password Reset Invalidation**

- **Current State:** Sessions are stored in KV with a TTL. If a user changes their password because they were hacked, the _hacker's existing active session_ remains valid for up to 24 hours.
- **The Risk:** A compromised account cannot be fully secured by the user.
- **The Fix:** Add a `token_version` (int) to the User table and the Session KV.
  - On Password Reset: Increment `user.token_version`.
  - On Verify: Check if `session.token_version == user.token_version`. If not, reject.

### 🟡 Operational Gaps (Highly Recommended)

**4. Audit Logging**

- **Current State:** No logs of who logged in, who failed login, or who reset passwords.
- **The Risk:** If an incident occurs, you have no way to trace what happened. This is usually required for compliance (SOC2, GDPR, etc.).
- **The Fix:** Create an `audit_logs` table in D1 and record `(user_id, action, ip, timestamp)` for every auth event.

**5. Error Handling & User Feedback**

- **Current State:** `auth.service.ts` often returns generic boolean flows or voids.
- **The Fix:** Ensure `try/catch` blocks in your handlers distinguish between "System Error" (D1 is down) and "User Error" (Bad password). Right now, a database failure might look like a wrong password or crash the worker.

**6. Rate Limiting Scope**

- **Current State:** You have `AUTH_LIMITER` on IP address.
- **The Risk:** A sophisticated attacker uses a botnet (different IPs) to brute-force a _single_ account.
- **The Fix:** You should also rate limit by `email` (e.g., allow only 5 failed login attempts per email per 10 minutes).

### 🟢 What is Ready (The Good Stuff)

- **Architecture:** The specific `sso` vs `app` logic is solid.
- **Cookie Security:** `HttpOnly`, `Secure`, `SameSite=Lax`, and Domain scoping are configured correctly for production.
- **Cryptography:** Using Web Crypto API (`PBKDF2`) is correct and secure.
- **Framework:** Hono + Cloudflare Workers is an excellent, high-performance choice.

### Roadmap to Production

1.  **Stop:** Do not deploy `schema.sql` as is. Set up D1 migrations.
2.  **Harden:** Implement the IP/User-Agent check in `SessionRepository`.
3.  **Secure:** Implement the `token_version` logic to allow global revocation.
4.  **Launch.**
