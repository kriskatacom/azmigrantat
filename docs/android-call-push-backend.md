# Android incoming-call PHP contract

The PHP application stores device tokens, authorizes calls against the existing
direct-conversation membership rules, and proxies mobile call actions to the
authoritative realtime server. It does not send FCM or own call state.

## Authentication

- Public `/api/mobile/*` routes use the existing OAuth Bearer access token. The
  token must be unexpired and belong to an active user.
- Internal `/internal/mobile/*` routes require `X-Internal-Secret` equal to
  `REALTIME_INTERNAL_SECRET`. The comparison is timing-safe.

## Public endpoints

### `POST /api/mobile/push-tokens`

FCM request:

```json
{"token":"FCM_DEVICE_TOKEN","platform":"android","provider":"fcm","device_id":null}
```

`provider` defaults to `expo` for compatibility with the existing chat client.
FCM is Android-only. The authenticated user owns the registration; body user
IDs are ignored. Registration atomically creates, refreshes, reactivates, or
re-associates the `(token, provider)` row and updates `last_seen_at`.

### `DELETE /api/mobile/push-tokens`

```json
{"token":"FCM_DEVICE_TOKEN","provider":"fcm"}
```

Idempotently marks only the authenticated user's matching row inactive with
reason `logout`. The legacy `POST /api/mobile/push-tokens/delete` route remains.

### `GET /api/mobile/turn-credentials`

Authenticated users receive short-lived Coturn REST credentials (`use-auth-secret`). The response includes STUN + TURN `iceServers` and `expires_at` (unix). The static auth secret is never returned. Rate limits: 20/user and 40/IP per 15 minutes.

### `POST /api/mobile/calls/{call_id}/action`

Accepts only `{"action":"accept"}` or `{"action":"reject"}`. The PHP server
forwards the call ID, authenticated user ID, and action to realtime. A valid
result returns `status: accepted|rejected`; a stale, terminal, missing, or
wrong-recipient call returns HTTP 409 and `code: CALL_NOT_ACTIONABLE`. Realtime
transport failures return HTTP 503 and never create local state.

## Internal endpoints

### `GET /internal/mobile/push-tokens?user_id=44`

Returns only active rows having `platform=android` and `provider=fcm`, selecting
only token, platform, and provider.

### `POST /internal/mobile/calls/authorize`

Request: `{"caller_id":22,"recipient_id":44}`. Both users must exist, be
active, differ, and be current participants in the same active direct
conversation. Success includes its `conversation_id`; denial returns
`{"success":true,"authorized":false}`.

### `POST /internal/mobile/push-tokens/deactivate`

Request:

```json
{"token":"FCM_DEVICE_TOKEN","provider":"fcm","reason":"messaging/registration-token-not-registered"}
```

Idempotently deactivates the matching FCM token. The realtime server must call
this only for permanent Firebase registration failures.

## PHP to realtime

PHP uses the existing `RealtimeNotifier`, `REALTIME_SERVER_URL`, and
`REALTIME_INTERNAL_SECRET` transport:

```text
POST {REALTIME_SERVER_URL}/internal/events/call-action
X-Internal-Secret: {REALTIME_INTERNAL_SECRET}
Content-Type: application/json
```

Payload: `{"call_id":"...","user_id":44,"action":"accept|reject"}`. Connect
and total request timeout are both five seconds.
