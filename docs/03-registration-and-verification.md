# 03. Registration & Verification Flow

Registration is complex because Derbent acts as a single source of truth for multiple subdomains. It enforces strict rules regarding Global accounts (`sso`) versus App-Specific accounts (e.g., `geveze`).

## Step 1: POST `/register`

1. **Validation**: `AuthHandler` validates the payload (passwords must match, email format, etc.).
2. **Service Layer (`AuthService.register`)**:
   - **Business Rules Enforcement**:
     - Queries DB to see if an `sso` account already exists for this email. If so, rejects registration.
     - If registering for an app (`geveze`), checks if a `geveze` account exists.
     - If registering for `sso`, checks if _any_ app-specific accounts exist for this email to prevent conflicting upgrades.
   - **Hashing**: Calls `hashPassword()` to generate a PBKDF2 salt and hash.
   - **Database**: Calls `UserRepository.create()` to insert the user into D1 with `email_verified: 0`.
   - **Token Generation**: Generates a UUID for email verification.
   - **KV Storage**: Calls `TokenRepository.saveEmailVerificationToken()`, saving it under the prefix `verify_email:<token>` for 15 minutes.
   - **Emailing**: Calls `EmailService.sendVerificationEmail()`.
3. **Response**: Handler redirects user to `/verify-pending`.

## Step 2: GET `/verify-email`

When the user clicks the link in their email:

1. **Handler (`AuthHandler.handleVerifyEmail`)**: Extracts the `token` from the query string and passes it to the `AuthService`.
2. **Service Layer (`AuthService.verifyEmailToken`)**:
   - Asks `TokenRepository` to find the `userId` associated with the token in KV.
   - If it doesn't exist (expired or invalid), throws an error.
   - If it exists, calls `UserRepository.markEmailVerified(userId)` (Updates D1 `email_verified` to `1`).
   - Cleans up by deleting the token from KV.
3. **Response**: Returns the HTML Login page with a success message: "Email verified successfully! You can now log in."
