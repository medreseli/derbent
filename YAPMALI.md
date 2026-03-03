# OKU

- https://chatgpt.com/c/69a2c3d6-d8a8-8331-9f41-1446bce4f789
- https://chatgpt.com/c/69a17e65-3e50-8327-869b-7b8ffb484780

# YAP

- **Session Revocation:** Right now, users can log out of their _current_ session. But what if they want to "Log out of all devices"? You need a way to track which sessions belong to which user. You could store a list of active `sessionId`s in the user's D1 `metadata` or use KV prefixes to find and delete them.
- **OAuth / Social Login:** Adding "Login with GitHub" or "Login with Google" would make this a true SSO provider. You would handle the OAuth callback and map the social email to your `users` table.

- **Caching Verification:** Your service bindings hit `/verify` on every request. This is fast on Cloudflare, but costs CPU time.
  - _Fix:_ The app consuming the verification (e.g., `geveze`) should cache the validation result in memory for 1-5 minutes to reduce load on Derbent.

---

**5. Error Handling & User Feedback**

- **Current State:** `auth.service.ts` often returns generic boolean flows or voids.
- **The Fix:** Ensure `try/catch` blocks in your handlers distinguish between "System Error" (D1 is down) and "User Error" (Bad password). Right now, a database failure might look like a wrong password or crash the worker.
