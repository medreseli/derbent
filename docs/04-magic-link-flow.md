# 04. Magic Link Flow

The Magic Link flow allows users to bypass passwords entirely. Because clicking a magic link proves ownership of the inbox, it inherently acts as both a login and an email verification step.

## Step 1: Requesting the Link (`POST /magic-link`)

1. **Handler**: Validates the email address via Valibot.
2. **Service (`AuthService.requestMagicLink`)**:
   - Queries `UserRepository` for the user.
   - _Security Note_: If the user does not exist, it silently returns success. This prevents malicious actors from enumerating registered emails.
   - Generates a UUID token.
   - Calls `TokenRepository.saveMagicLinkToken()` storing it in KV for 15 minutes.
   - Calls `EmailService.sendMagicLinkEmail()`, passing the `token`, `appId`, and `redirect` params.
3. **Response**: Renders a success HTML page telling the user to check their inbox.

## Step 2: Consuming the Link (`GET /verify-magic-link`)

When the user clicks the email link:

1. **Handler**: Extracts the `token`, `app_id`, and `redirect`. Calls `AuthService.verifyMagicLink()`.
2. **Service (`AuthService.verifyMagicLink`)**:
   - Looks up the token in KV via `TokenRepository`.
   - If valid, fetches the `User` from D1.
   - **Authorization Check**: Ensures the user has permission to log into the requested `app_id` (they must belong to that app or be an `sso` user).
   - **Auto-Verification**: If `user.email_verified === 0`, it automatically updates D1 to mark them as verified.
   - Deletes the single-use token from KV.
   - Generates a `sessionId`, creates a `Session` object, and saves it to KV via `SessionRepository`.
3. **Handler (Finishing up)**:
   - Sets the `session_<app_id>` cookie.
   - Redirects the user to the application's target URL.
