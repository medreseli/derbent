# OKU

- https://chatgpt.com/c/69a2c3d6-d8a8-8331-9f41-1446bce4f789
- https://chatgpt.com/c/69a17e65-3e50-8327-869b-7b8ffb484780

# YAP

- Remove /admin route and related code

- **Session Revocation:** Right now, users can log out of their _current_ session. But what if they want to "Log out of all devices"? You need a way to track which sessions belong to which user. You could store a list of active `sessionId`s in the user's D1 `metadata` or use KV prefixes to find and delete them.
- **OAuth / Social Login:** Adding "Login with GitHub" or "Login with Google" would make this a true SSO provider. You would handle the OAuth callback and map the social email to your `users` table.

* **Session Hijacking Prevention:** If a user's session cookie is stolen, the attacker has full access.
  - _Fix:_ When creating a session in KV, store the user's `User-Agent` and IP address. On the `/verify` internal endpoint, ensure the IP/Agent hasn't wildly changed.

- **The "Log Out Everywhere" Problem:** Right now, a user's session is stored in KV as `sessionId -> SessionData`. If a user gets hacked and resets their password, you have no way to find and delete their active sessions because you don't know their `sessionId`s.
  - _Fix:_ In your D1 `users` table, add a `version` integer. Put that same `version` in the KV session. If a user resets a password, increment `version` in D1. In your `/verify` endpoint, check if the Session's version matches the D1 version. (Alternatively, maintain a list of active `sessionId`s in the user's D1 `metadata`).
- **Caching Verification:** Your service bindings hit `/verify` on every request. This is fast on Cloudflare, but costs CPU time.
  - _Fix:_ The app consuming the verification (e.g., `geveze`) should cache the validation result in memory for 1-5 minutes to reduce load on Derbent.

- **Audit Logs:** Add an `audit_logs` table to D1. Every time a user logs in, fails a login, or resets a password, write a row: `(user_id, action, ip_address, timestamp)`. This is highly requested in B2B apps.
- **Database Migrations:** Right now you are running manual SQL commands (`wrangler d1 execute`). Cloudflare has a built-in migration system (`wrangler d1 migrations create`). You should move `schema.sql` into a proper migrations folder so you can track DB changes via Git.
