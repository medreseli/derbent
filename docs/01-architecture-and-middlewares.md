# 01. Architecture & Middlewares

Before diving into specific routes, it is crucial to understand what happens to **every** request that hits the Derbent worker. Derbent uses a layered architecture, and the request lifecycle always starts at the router level in `src/index.ts`.

## The Request Lifecycle Pipeline

When a request arrives at the Cloudflare Worker, Hono processes it through a series of global and route-specific middlewares before it reaches the handler.

### 1. Global Security Headers

```typescript
app.use('*', secureHeaders());
```

Hono injects standard security headers (like X-XSS-Protection, X-Frame-Options) into the response.

### 2. Dependency Injection (DI) Context

```typescript
app.use('*', async (c, next) => { ... })
```

This is the most critical middleware. It instantiates the entire Service and Repository layer and attaches them to the Hono Context (`c`).

1. **Repositories** are created, binding to Cloudflare Env variables:
   - `UserRepository` (binds to `c.env.DB` - D1 SQLite)
   - `SessionRepository` (binds to `c.env.KV`)
   - `TokenRepository` (binds to `c.env.KV`)
2. **Services** are created, taking repositories as arguments:
   - `EmailService`
   - `AuthService`
3. Finally, `AuthService` is stored in the request context: `c.set('authService', authService)`.

### 3. Rate Limiting (Route Specific)

For POST routes (like `/login`, `/register`), the `rateLimit()` middleware is invoked.

1. It reads the user's IP address (`cf-connecting-ip`).
2. It hits the Cloudflare Rate Limiter binding (`c.env.AUTH_LIMITER`).
3. If exceeded, it short-circuits and returns a `429 Too Many Requests` HTML page.

### 4. CSRF Protection (Route Specific)

- **`csrfOnGet`**: Checks if a `csrf_token` cookie exists. If not, generates a UUID, sets the cookie, and attaches it to `c.set('csrfToken', token)`. This token is injected into HTML forms.
- **`csrfOnPost`**: Extracts the `csrf_token` from the incoming FormData and compares it to the browser's cookie. If they don't match, it returns `403 Forbidden`.

Once the request passes these gates, it arrives at the **Handler Layer** (e.g., `AuthHandler`).
