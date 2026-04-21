# YAP

Add a new OAuth provider (e.g., Google, Discord).
Add a new UI page or expand the Admin API.
Implement additional security features like Passkeys (WebAuthn), Passwordless login.
Write unit tests using @cloudflare/vitest-pool-workers.
Help integrate a consuming application via Cloudflare Service Bindings.

- Resend webhook to listen for email delivery results and taking necessary actions

---

2. User-Agent Binding is Weak Security

User-Agent is:

Easily spoofed
Not stable across updates

👉 Don’t rely on it as a strong signal.

Better signals:
cf-ray patterns
TLS fingerprinting (if available)
Session rotation frequency

---

5. Rate Limiting per Identity

Not just per IP:

email-based throttling

---
