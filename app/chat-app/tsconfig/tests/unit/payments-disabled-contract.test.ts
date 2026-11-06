import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const eas = JSON.parse(readFileSync("../eas.json", "utf8")) as {
  build: Record<string, { env?: Record<string, string> }>;
};
const paymentService = readFileSync("../src/services/payments.ts", "utf8");
const profileScreen = readFileSync("../src/app/(profile)/index.tsx", "utf8");
const backendFeature = readFileSync("../../../auth/app/Services/PaymentsFeature.php", "utf8");
const backendCheckout = readFileSync("../../../auth/app/Services/SubscriptionService.php", "utf8");
const backendCards = readFileSync("../../../auth/app/Services/PaymentMethodService.php", "utf8");
const subscriptionController = readFileSync(
  "../../../auth/app/Controllers/Api/SubscriptionController.php",
  "utf8",
);

describe("payments disabled release contract", () => {
  it("disables payments in every concrete EAS build profile", () => {
    for (const profile of ["development", "staging", "production"] as const) {
      expect(eas.build[profile].env?.EXPO_PUBLIC_ENABLE_PAYMENTS).toBe("false");
    }
  });

  it("hides the payment entry and rejects mobile payment mutations", () => {
    expect(profileScreen).toContain("PAYMENTS_ENABLED ?");
    expect(paymentService).toContain("assertPaymentsEnabled();");
    expect(paymentService).toContain("Плащанията не са достъпни");
  });

  it("keeps payment code but blocks checkout and PAN storage by default", () => {
    expect(backendFeature).toContain("PAYMENTS_ENABLED");
    expect(backendFeature).toContain("?: 'false'");
    expect(backendCheckout).toContain("PaymentsFeature::assertEnabled();");
    expect(backendCards).toContain("PaymentsFeature::assertEnabled();");
    expect(backendCards).toContain("pan_ciphertext");
    expect(subscriptionController.match(/paymentsUnavailable\(\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(subscriptionController).toContain("'code' => 'payments_disabled'");
  });
});
