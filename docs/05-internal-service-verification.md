# 05. Internal Service Verification Flow

Derbent is an Auth microservice. Other Cloudflare Workers on your domain (like a backend API for `geveze`) do not have direct access to Derbent's KV store. They use Cloudflare **Service Bindings** to talk to Derbent over the internal Cloudflare network.

## Scenario

A user makes a request to `api.geveze.zerdalu.com/data`. The Geveze worker needs to know who this user is.

## The Flow (`GET /internal/verify`)

1. **Geveze Worker**: Takes the browser's `Cookie` header and forwards it to Derbent via Service Binding:

   ```typescript
   await env.DERBENT.fetch('http://internal/internal/verify?app_id=geveze', {
   	headers: { Cookie: request.headers.get('Cookie') },
   });
   ```

2. **Derbent Router**: Hits `InternalHandler.verify`. Note that this route does **not** use CSRF or Rate Limiting middlewares, as it's an internal machine-to-machine request.

3. **Cookie Extraction**:
   - Derbent looks for a cookie named `session_geveze`.
   - If not found, it falls back to looking for `session_sso` (Global login).
   - If neither exists, returns `401 Unauthorized`.

4. **Service Validation (`AuthService.verifySession`)**:
   - Looks up the extracted `sessionId` in KV (`SessionRepository.get()`).
   - If not found in KV (session expired or user logged out), returns `401`.
   - **Authorization Rule**: It checks if `session.appId` matches the required `appId` passed in the query string. If the session belongs to `hodan` but Geveze requested verification, it throws a `403 Forbidden`. (`sso` sessions are allowed everywhere).

5. **Response**:
   - Returns a `200 OK` with the Session object as JSON.
   - The Geveze worker receives this JSON, now knows the user's `id`, `email`, and `role`, and allows the API request to proceed.
