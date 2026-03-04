# OKU

- https://chatgpt.com/c/69a2c3d6-d8a8-8331-9f41-1446bce4f789
- https://chatgpt.com/c/69a17e65-3e50-8327-869b-7b8ffb484780

# YAP

### 🔴 Critical Issues (Needs fixing before launch)

**3. CPU Limit Risks with PBKDF2**
You are using 100,000 iterations for PBKDF2. While this is mathematically secure, Cloudflare Workers have strict CPU time limits (10ms for free tier/bundled, 50ms for unbound).

- **Risk:** 100k iterations using the Web Crypto API might sporadically exceed the CPU limit (`Error 1102`) during concurrent login spikes.
- **Fix:** You must rigorously load-test the login/register route. If you hit CPU limits, you may need to rely on Cloudflare Workers Unbound routing, or slightly tune the iterations (though 100k is the OWASP minimum).

---

### 🟡 Minor Improvements & Polish

**1. Email Resiliency (No Retries)**
If the Resend API times out or throws a 5xx error, your `AuthService` will fail and surface an error to the user during registration or password reset.

- **Improvement:** In a highly robust production app, emails are sent via **Cloudflare Queues** so they can be retried automatically in the background without making the user wait.

**2. ID Generation (UUIDv4 vs UUIDv7)**
Your `schema.sql` comments mention `UUIDv7 or NanoID`, but your code uses `crypto.randomUUID()` which generates UUIDv4.

- **Improvement:** UUIDv4 is completely random, which causes fragmentation in database indexing (B-Trees) over time. Implementing a lightweight UUIDv7 or ULID generator would improve D1 read/write performance at scale.

**3. Internal Verifier Weak IP/UA Defaulting**
In `internal.handler.ts`:

```typescript
const clientIp = c.req.header('Derbent-Client-IP') || c.req.header('cf-connecting-ip') || 'unknown';
```

If a consuming app (like Geveze) forgets to pass the headers via the Service Binding, Derbent falls back to `'unknown'`. This negates your session hijacking protection.

- **Improvement:** Derbent should enforce that consuming apps provide these headers for internal verifications, perhaps throwing a 400 error if they are missing.
