# Future paid GPU job contract v1 (not active)

This contract reserves data boundaries for a future paid video restoration. It
does not create, capture, refund or report a payment.

Before a GPU can be provisioned, the backend must persist an immutable payment
reservation with a unique `reservation_id`, the enhancement `job_id`, the job
`idempotency_key`, currency, integer minor-unit amount, confirmation timestamp
and state `confirmed`. A reservation can belong to exactly one job. Retried API
requests return the existing job/reservation and never create a second charge.

The orchestrator accepts only a server-authenticated authorization document
whose job, lease and user/video ownership match the existing V3 job. Released
or refunded reservations deny provisioning. Technical failure transitions the
job to a recoverable/terminal state first, then emits an idempotent refund or
credit-release instruction for the future payment subsystem; the orchestrator
does not call Stripe or Google Play directly.

The future availability response may add these backward-compatible fields:

```json
{
  "gpu_ai": {
    "available": false,
    "reason": "gpu_provisioning_disabled",
    "estimated_seconds": null,
    "price": null,
    "currency": null
  }
}
```

The future job status reuses existing status/progress/cancel semantics and may
add provider-neutral cost metadata visible only to trusted backend operations.
Provider instance IDs, internal quoted prices, secrets and capability URLs are
never returned to the mobile app.
