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

Now that the **Dynamic Configuration** is solid, the project is a very capable, production-ready Auth Engine.

To take it to the next level, I suggest focusing on one of these three paths, depending on what is most important for your current needs:

### 1. User Security Dashboard (Self-Service)

Currently, users can change their password and 2FA. However, modern auth systems allow users to see their **own** security state.

- **Active Sessions List:** Show the user a list of all devices currently logged in (pulled from KV).
- **Revoke Specific Session:** Let them click "Logout" on that old laptop they left at the office.
- **Personal Audit Logs:** Let users see their own recent logins and security changes.
- **Why?** This reduces support requests and builds trust with your users.

### 2. Customizable Email Templates (Dynamic Branding)

Right now, the email HTML (Verification, Reset, Magic Link) is hardcoded as strings inside `EmailService.ts`.

- **D1 Templates:** Move the HTML and Subjects into the `settings` or a new `email_templates` table.
- **Dynamic Variables:** Allow the admin to use placeholders like `{{user_email}}`, `{{app_name}}`, and `{{action_url}}`.
- **Admin UI:** Since you are building a dashboard, the Admin could eventually edit the look and feel of the emails directly in the UI.
- **Why?** This makes Derbent a true "White Label" solution for your other apps.

### 3. Passkeys (WebAuthn) Support

This is the "gold standard" for modern authentication.

- **Passwordless:** Allow users to register their TouchID, FaceID, or YubiKey.
- **Edge Native:** WebAuthn works beautifully with the Web Crypto API on Cloudflare Workers.
- **Why?** It completely eliminates the risk of phishing and is much faster for users than typing passwords or waiting for 2FA codes.

---

**My Recommendation:**
I suggest starting with **Path 1 (User Security Dashboard)**. It utilizes the KV Session store and D1 Audit Logs we already have, and it turns the "Landing Page" from a simple list of apps into a powerful security hub.

**Which path sounds most interesting to you?** (Or is there a specific UI component or integration you'd like to polish first?)
