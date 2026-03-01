# 02. Standard Login Flow

This document explains what happens when a user attempts to log in via email and password.

## Step 1: GET `/login` (Rendering the Form)

1. **Router**: Hits `app.get('/login')`. Passes through `csrfOnGet`.
2. **Handler**: `AuthHandler.renderLogin(c)` is called.
3. **Extraction**: `getParams(c)` reads `app_id` (e.g., 'geveze' or 'sso') and `redirect` from the URL query string.
4. **View**: It calls the `loginPage()` view function, passing the CSRF token and parameters.
5. **Response**: Hono returns the generated HTML string to the browser.

## Step 2: POST `/login` (Submitting Credentials)

When the user submits the form, a complex sequence of validations and business logic begins.

1. **Middlewares**: Passes `rateLimit()` and `csrfOnPost()`.
2. **Handler layer (`AuthHandler.handleLogin`)**:
   - Parses the FormData.
   - Validates the input using Valibot (`LoginSchema`). Ensures email is valid and password meets length requirements.
   - If validation fails, it re-renders the `loginPage` with an error message.
   - If valid, it extracts `authService` from the context and calls `authService.login()`.

3. **Service Layer (`AuthService.login`)**:
   - Calls `UserRepository.findForLogin(email, appId)`.
     _Note: The SQL query checks if the user exists for the specific app OR as a global 'sso' user._
   - If user exists, it calls `verifyPassword()` (Web Crypto API) to hash the input and compare it against the stored `phash`.
   - Checks if `user.email_verified === 1`. If not, throws an `EMAIL_NOT_VERIFIED` error.
   - Generates a new `sessionId` (UUID v4).
   - Calls `SessionRepository.create()` to store the session data in KV (valid for 24 hours).
   - Returns the `sessionId` and the actual `app` context back to the handler.

4. **Handler Layer (Finishing up)**:
   - Sets the `session_<app_id>` cookie on `.zerdalu.com` (dynamically handling localhost vs production).
   - Returns a `302 Redirect` to the `redirect` URL provided in the query params.

### Error Handling Edge Case

If the `AuthService` threw an `EMAIL_NOT_VERIFIED` error, the Handler catches it, automatically fires `authService.requestNewVerification()`, and redirects the user to the `/verify-pending` page.
