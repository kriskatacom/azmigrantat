import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const eas = JSON.parse(readFileSync("../eas.json", "utf8")) as {
  build: Record<string, { env?: Record<string, string> }>;
};
const mobileService = readFileSync("../src/services/payments.ts", "utf8");
const subscriptionScreen = readFileSync("../src/app/(profile)/subscriptions.tsx", "utf8");
const resultScreen = readFileSync("../src/app/(profile)/subscription-result.tsx", "utf8");
const checkoutService = readFileSync(
  "../../../auth/app/Services/SubscriptionCheckoutHandoffService.php",
  "utf8",
);
const stripeSandboxFeature = readFileSync(
  "../../../auth/app/Services/StripeSandboxFeature.php",
  "utf8",
);
const checkoutClient = readFileSync(
  "../../../auth/app/Services/StripeCheckoutClient.php",
  "utf8",
);
const webhookService = readFileSync(
  "../../../auth/app/Services/SubscriptionService.php",
  "utf8",
);
const catalogueClient = readFileSync(
  "../../../auth/app/Services/StripeCatalogueClient.php",
  "utf8",
);
const renewalService = readFileSync(
  "../../../auth/app/Services/SubscriptionRenewalService.php",
  "utf8",
);
const cancellationService = readFileSync(
  "../../../auth/app/Services/SubscriptionCancellationService.php",
  "utf8",
);
const cancellationMigration = readFileSync(
  "../../../auth/database/migrations/20261106231500_create_subscription_cancellation_requests.php",
  "utf8",
);
const subscriptionController = readFileSync(
  "../../../auth/app/Controllers/Api/SubscriptionController.php",
  "utf8",
);
const renewalMigration = readFileSync(
  "../../../auth/database/migrations/20261106213000_add_subscription_billing_safety.php",
  "utf8",
);
const paymentController = readFileSync(
  "../../../auth/app/Controllers/Api/PaymentMethodController.php",
  "utf8",
);
const userController = readFileSync(
  "../../../auth/app/Controllers/Api/UserController.php",
  "utf8",
);
const publicProfileScreen = readFileSync("../src/app/user/[id].tsx", "utf8");
const profileService = readFileSync("../src/services/profile.ts", "utf8");

describe("Stripe Sandbox subscription contract", () => {
  it("enables Sandbox subscriptions in every build profile while real payments stay off", () => {
    expect(eas.build.production.env?.EXPO_PUBLIC_ENABLE_PAYMENTS).toBe("false");
    for (const profile of ["development", "staging", "production"] as const) {
      expect(eas.build[profile].env?.EXPO_PUBLIC_ENABLE_STRIPE_SANDBOX).toBe("true");
    }
  });

  it("uses an active-user one-time app-to-site handoff", () => {
    expect(checkoutService).toContain("StripeSandboxFeature::enabledFor($user)");
    expect(stripeSandboxFeature).toContain("return self::enabled() && (bool) $user->is_active;");
    expect(stripeSandboxFeature).not.toContain("STRIPE_SANDBOX_ALLOWED_EMAILS");
    expect(checkoutService).toContain("hash('sha256', $token)");
    expect(checkoutService).toContain("time() + 600");
    expect(checkoutService).toContain("$locked->status !== 'created'");
    expect(checkoutService).toContain("play_external_transaction_token' => null");
    expect(checkoutService).toContain("$pendingCheckout->token_hash = hash('sha256', $token)");
    expect(checkoutService).toContain("retrieveSubscriptionSession");
    expect(checkoutService).toContain("consumeResumeToken");
  });

  it("accepts test keys and test Checkout sessions only", () => {
    expect(checkoutClient).toContain("STRIPE_TEST_SECRET_KEY");
    expect(checkoutClient).toContain("cs_test_");
    expect(checkoutClient).toContain("($session['livemode'] ?? true) !== false");
    expect(checkoutClient).not.toContain("payment_method_types");
    expect(checkoutClient).not.toContain("STRIPE_SECRET_KEY");
  });

  it("activates the handoff only after a signed Sandbox webhook", () => {
    expect(webhookService).toContain("STRIPE_TEST_WEBHOOK_SECRET");
    expect(webhookService).toContain("checkout.session.completed");
    expect(webhookService).toContain("completeHandoff");
    expect(webhookService).toContain("Live Stripe събитие не е разрешено");
  });

  it("uses exact 30-day periods and defaults renewal off at Stripe", () => {
    expect(catalogueClient).toContain("recurring[interval_count]");
    expect(catalogueClient).toContain("PaidPlanPricePolicy::INTERVAL_COUNT");
    expect(webhookService).toContain("wantsAutoRenewal()");
    expect(webhookService).toContain("setAutoRenewal");
  });

  it("changes renewal through the authenticated subscription endpoint", () => {
    expect(subscriptionController).toContain("function renewal()");
    expect(renewalService).toContain("where('user_id', $user->id)");
    expect(renewalService).toContain("StripeSubscriptionClient");
    expect(mobileService).toContain("/api/mobile/subscription/renewal");
    expect(subscriptionScreen).toContain("Автоматично подновяване");
    expect(subscriptionScreen).not.toContain("setSubscription({\n      ...subscription");
    expect(renewalService).toContain("SubscriptionRenewalChange");
    expect(renewalService).toContain("provider_applied");
  });

  it("immediately downgrades only the authenticated paid subscription after confirmation", () => {
    expect(subscriptionController).toContain("function cancel()");
    expect(subscriptionController).toContain("confirm_immediate_downgrade");
    expect(cancellationService).toContain("where('user_id', $user->id)");
    expect(cancellationService).toContain("cancelImmediately");
    expect(cancellationService).toContain("SubscriptionCancellationRequest");
    expect(cancellationMigration).toContain("subscription_cancellation_requests");
    expect(mobileService).toContain("/api/mobile/subscription/cancel");
    expect(mobileService).toContain("confirm_immediate_downgrade: true");
    expect(subscriptionScreen).toContain("Премини към безплатен план");
    expect(subscriptionScreen).toContain("Платеният достъп ще бъде прекратен веднага");
  });

  it("rejects non-30-day and stale provider state", () => {
    expect(webhookService).toContain("assertExactPaidPrice");
    expect(webhookService).toContain("PaidPlanPriceChange");
    expect(webhookService).toContain("last_stripe_event_created_at");
    expect(webhookService).toContain("StripeSubscriptionClient())->retrieve");
    expect(renewalMigration).toContain("subscription_renewal_changes");
  });

  it("does not accept raw card data", () => {
    expect(mobileService).not.toContain("SavePaymentMethodPayload");
    expect(mobileService).not.toContain("savePaymentMethod");
    expect(paymentController).not.toContain("input['cvc']");
    expect(paymentController).not.toContain("input['number']");
  });

  it("returns through the existing deep-link scheme and rechecks entitlement", () => {
    expect(mobileService).toContain("STRIPE_SANDBOX_ENABLED");
    expect(subscriptionScreen).toContain("Linking.openURL(url)");
    expect(subscriptionScreen).toContain("business.azmigrantat.com/subscriptions/start?token=");
    expect(resultScreen).toContain("getSubscription(token)");
    expect(resultScreen).toContain("subscription?.plan === \"paid\"");
  });

  it("renders the available paid-plan action as an illuminated button", () => {
    expect(subscriptionScreen).toContain("styles.planButton");
    expect(subscriptionScreen).toContain("paidButtonHighlighted && styles.paidButtonEnabled");
    expect(subscriptionScreen).toContain("!paidButtonHighlighted && styles.disabledButton");
    expect(subscriptionScreen).toContain('backgroundColor: "#A86F00"');
    expect(subscriptionScreen).toContain('paidButtonHighlighted ? "#FFF8D9"');
    expect(subscriptionScreen).toContain('flexDirection: "row"');
    expect(subscriptionScreen).toContain("numberOfLines={1}");
    expect(subscriptionScreen).toContain("paidIsActive ? null");
    expect(subscriptionScreen).toContain('name="card-outline"');
    expect(subscriptionScreen).not.toContain('paidIsActive ? "checkmark-circle"');
    expect(subscriptionScreen).toContain("elevation: 10");
    expect(subscriptionScreen).toContain("Активирай платения план");
  });

  it("shows a linked company on the public profile only with paid entitlement", () => {
    expect(userController).toContain("'has_paid_subscription' => (new SubscriptionService())->hasPaidEntitlement($profile)");
    expect(profileService).toContain("has_paid_subscription: boolean");
    expect(publicProfileScreen).toContain("profile?.has_paid_subscription !== true");
    expect(publicProfileScreen).toContain("profile.has_paid_subscription && company");
  });
});
