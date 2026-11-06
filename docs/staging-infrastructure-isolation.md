# Shared environment compatibility mode

Environment isolation is intentionally disabled. Development, staging/preview, and
production Android build profiles use the same production API, business API, realtime, video,
subscriptions, OAuth, Google/Firebase, and push-notification configuration.

This restores the deployment model used before the unfinished staging-isolation work.
The build names remain useful for development-client/internal/store build behavior, but
they do not select separate backend infrastructure.

## Operational warning

- Development and internal builds can read and modify real production data.
- Test logins create real production sessions and can affect real users.
- Push token registration and removal operate on the production notification system.
- The Android application ID and Firebase application are shared. Installing an
  internal build can replace or share OS application state with another build when the
  signing key permits it.
- Do not use synthetic accounts or destructive test data unless they are acceptable in
  production.

## Build and runtime contract

`scripts/validate-environment.mjs` runs during EAS pre-install. Every profile requires
the exact shared service URLs, mobile OAuth client, Google Web OAuth client, and enabled
Google Sign-In/push settings. The runtime assertion applies the same contract to Metro
bundles. Validation compares complete canonical URLs, including paths, and rejects
any textual deviation, including ports, URL credentials, queries, fragments, whitespace,
or path normalization syntax.

The build validator also checks the Android package in Expo and Gradle plus the matching
Android and Web OAuth entries and pinned checksum of `google-services.json`. Artifact
signature verification remains a release/smoke-test responsibility because the signing
key is applied later by EAS. The installed development APK and latest preview APK were
verified against registered Android OAuth certificates, and the live backend audience
was verified against the shared Web client. No current production-signed APK was
available, so its signing certificate remains an explicit release check. The checked-in
Android package and `google-services.json` are the production native
configuration. A separate staging package, Firebase project, DNS records, Redis
namespace, database, and service deployment are no longer required by the app.

## Reintroducing isolation later

Isolation must be implemented as a complete native and server tuple, not by changing
JavaScript URLs alone. It requires a distinct Android application ID, signing
certificates, Firebase/Google Android and Web OAuth clients, `google-services.json`,
backend audience, mobile OAuth client, databases, storage, Redis, realtime process,
push configuration, DNS, and TLS. Until that complete tuple exists, do not partially
switch individual profiles away from shared compatibility mode.

This document and the automated evidence cover Android. They do not claim that native
Google Sign-In is configured or verified for iOS.
