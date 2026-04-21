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

Step 1: Core Aggregated Metrics (Most Important)
These give you an immediate health and security posture overview in just 2 highly optimized SQL queries.
Total Users (Scale)
New Users (Last 7 Days) (Growth)
MFA Usage Rate (Security Posture)
Locked Accounts (Security Posture)
Failed Logins (Last 24h) (Threats)
Account Lockouts Triggered (Last 24h) (Threats)
Password Reset Requests (Last 24h) (Account recovery volume)

Step 2: Time-Series Trends (Medium Priority)
These will power the charts on your dashboard. 8. Sign-ups Trend (Last 7/30 days) (Grouped by day) 9. Login Success vs Failure Trend (Last 7/30 days) (Grouped by day)

---
