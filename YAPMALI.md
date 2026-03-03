# OKU

- https://chatgpt.com/c/69a2c3d6-d8a8-8331-9f41-1446bce4f789
- https://chatgpt.com/c/69a17e65-3e50-8327-869b-7b8ffb484780

# YAP

- **Caching Verification:** Your service bindings hit `/verify` on every request. This is fast on Cloudflare, but costs CPU time.
  - _Fix:_ The app consuming the verification (e.g., `geveze`) should cache the validation result in memory for 1-5 minutes to reduce load on Derbent.

- Logout All with Email
  Current logoutall only works for an account that has multiple sessions from different devices, browsers etc.
  We should also implement logoutall with email functionality so that every session related to that email can be invalidated.

---

**5. Error Handling & User Feedback**

- **Current State:** `auth.service.ts` often returns generic boolean flows or voids.
- **The Fix:** Ensure `try/catch` blocks in your handlers distinguish between "System Error" (D1 is down) and "User Error" (Bad password). Right now, a database failure might look like a wrong password or crash the worker.
