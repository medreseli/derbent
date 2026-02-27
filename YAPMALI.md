### 1. Email Verification with Resend - DONE, NEEDS TO BE CHECKED

An identity provider isn't complete without verifying email ownership.

- **Database Update:** Add an `email_verified BOOLEAN DEFAULT 0` column to your `users` table in `schema.sql`.
- **Token Generation:** When a user registers, generate a secure random token (e.g., `crypto.randomUUID()`).
- **Storage:** Store this token in **KV** with a short TTL (e.g., 15 minutes) mapped to the user's ID: `kv.put('verify_email:<token>', userId, { expirationTtl: 900 })`.
- **Resend Integration:** Use `fetch` to call the Resend API (`https://api.resend.com/emails`) to send a clean HTML email containing a link like `https://derbent.zerdalu.com/verify-email?token=<token>`.
- **Enforcement:** Modify your login logic. If `user.email_verified === 0`, redirect them to a "Please verify your email" page instead of creating a session.

### 2. Crucial Security Fixes (Portfolio Must-Haves) - DONE, NEEDS TO BE CHECKED

If an employer or security-minded developer looks at this code, they will look for these:

- **XSS Protection in Templates:** Currently, you are using raw JavaScript template literals for HTML (`src/lib/html.ts`). If any user input is reflected in the HTML (like the `error` parameter), it is a potential Cross-Site Scripting (XSS) vulnerability. You should implement a simple HTML escape function for all dynamic variables, or switch to a lightweight JSX renderer.
- **Rate Limiting:** Auth endpoints (`/login` and `/register`) are prime targets for brute-force and credential stuffing attacks. You should implement rate limiting. Cloudflare WAF handles this easily, but you can also use the new Cloudflare Workers Rate Limiting API.
  https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

### 3. Core Identity Features

- **Password Reset Flow:** Add a "Forgot Password" link. This will use the exact same logic as Email Verification: generate a token, store in KV, email via Resend, and create a `/reset-password?token=...` page. **- DONE, NEEDS TO BE CHECKED**
- **Session Revocation:** Right now, users can log out of their _current_ session. But what if they want to "Log out of all devices"? You need a way to track which sessions belong to which user. You could store a list of active `sessionId`s in the user's D1 `metadata` or use KV prefixes to find and delete them.
- **OAuth / Social Login:** Adding "Login with GitHub" or "Login with Google" would make this a true SSO provider. You would handle the OAuth callback and map the social email to your `users` table.

### 4. Code Architecture & DX - DONE, NEEDS TO BE CHECKED

- **Routing Library:** Your `index.ts` manually checks `if (path === '/' && method === 'GET')`. As you add `/verify-email`, `/forgot-password`, and `/reset-password`, this file will become massive. I highly recommend migrating to a lightweight edge router like **Hono**. It handles routing, query parsing, and has built-in XSS-safe JSX templating out of the box.
- **Security Headers:** Add headers like `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a basic `Content-Security-Policy` to your `htmlResponse` function.
