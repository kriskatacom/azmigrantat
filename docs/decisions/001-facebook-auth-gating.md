# ADR-001: Facebook authentication uses explicit linking and client allow-listing

## Status

Accepted, implementation disabled pending isolated testing

## Date

2026-10-31

## Context

„Ето ме“ needs Facebook Login without allowing a matching social email to take over an existing account. All current EAS profiles use the production API and the same public OAuth client, so a backend global flag alone cannot distinguish a development build from a Play build. Meta also cannot yet verify `com.etome.app` from the internal-only Play listing.

## Decision

- Facebook identities already linked in `user_social_accounts` may sign in.
- A new Facebook identity may create an account only when Meta returns a valid email and no active or soft-deleted local account has that email.
- A matching existing email returns `facebook_link_required`; it is never linked automatically.
- Linking happens only from an authenticated account and requires the current password. Accounts without a password must set one first.
- The backend is deny-by-default and requires `APP_ENV=development`, `FACEBOOK_AUTH_ENABLED=true`, and a dedicated OAuth client ID in `FACEBOOK_ALLOWED_CLIENT_IDS`.
- Every shared-production EAS profile keeps `EXPO_PUBLIC_ENABLE_FACEBOOK_SIGN_IN=false`. Local development may opt in only with `EXPO_PUBLIC_APP_ENV=development`, a separate allowed OAuth client, a non-committed `FACEBOOK_CLIENT_TOKEN`, and an enabled non-production backend.
- The App Secret remains backend-only. Access tokens are verified against a pinned Graph API version for app ID, user ID, type, scopes, token expiry and data-access expiry. Profile lookup uses `appsecret_proof`.
- Meta SDK tracking and automatic event logging are disabled.

## API contract

- `POST /api/mobile/auth/facebook` — public interactive login using `client_id` and `access_token`.
- `GET /api/mobile/profile/social/facebook` — reports whether Facebook is linked and allowed for the current OAuth client.
- `POST /api/mobile/profile/social/facebook` — links an identity using `access_token` and `current_password`.

Errors expose stable codes such as `facebook_auth_disabled`, `facebook_client_not_allowed`, `facebook_invalid_token`, `facebook_link_required`, `facebook_identity_conflict`, `facebook_service_unavailable`, `rate_limited`, and `unauthenticated`.

## Alternatives considered

### Automatically link accounts with matching email

Rejected because an email assertion from a new provider must not silently create a persistent login method for an existing account.

### Enable Facebook globally for the shared development EAS profile

Rejected because the profile talks to production and uses the same OAuth client as production builds. The backend cannot safely distinguish it from raw or released clients.

### Rely on device biometrics for linking

Rejected because local biometric success is not independently verifiable by this backend. Password verification is used until a dedicated server-verifiable reauthentication challenge exists.

## Activation gates

1. Create a separate development OAuth application/client in the backend.
2. Point the development build at an isolated non-production auth backend and allow only that dedicated client.
3. Store Meta Client Token as a local/EAS secret; never commit it.
4. Enable the backend and mobile flags only in that isolated environment.
5. Complete Android device tests for new account, existing identity, link-required collision, password step-up, missing email, expired token, rate limiting and Meta outage.
6. After Meta accepts the Android platform and the Play-distributed build passes testing, prepare a separate decision to enable production and generate a new AAB.

Production activation intentionally requires a reviewed code/config change to remove the development-only backend guard; setting an environment flag alone is insufficient.

## Consequences

- Facebook Login code is present but unavailable to users in every current EAS build.
- Enabling production requires a new native AAB; it cannot be switched on safely by OTA JavaScript alone.
- No production backend, Meta setting, user data or OAuth row was changed by this implementation.
