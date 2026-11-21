import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const registrationScreen = readFileSync("src/app/(auth)/register.tsx", "utf8");
const loginScreen = readFileSync("src/app/(auth)/login.tsx", "utf8");
const googleButton = readFileSync("src/components/auth/google-login-button.tsx", "utf8");
const authContext = readFileSync("src/contexts/AuthContext.tsx", "utf8");
const authService = readFileSync("src/services/auth.ts", "utf8");
const mobileAuthController = readFileSync("../../auth/app/Controllers/Api/MobileAuthController.php", "utf8");

describe("registration subscription choice", () => {
  it("defaults to free and asks for a plan before creating the profile", () => {
    expect(registrationScreen).toContain(
      'useState<RegistrationPlan>("free")',
    );
    expect(registrationScreen).toContain("setPlanPickerVisible(true)");
    expect(registrationScreen).toContain("Безплатният план е избран по подразбиране.");
  });

  it("persists the profile before opening paid checkout", () => {
    const registerPosition = registrationScreen.indexOf("response = await register({");
    const checkoutPosition = registrationScreen.indexOf(
      'createSubscriptionCheckout(response.token, "paid")',
    );
    const persistPosition = registrationScreen.indexOf("completeAuthResponse(response)");

    expect(registerPosition).toBeGreaterThan(-1);
    expect(checkoutPosition).toBeGreaterThan(registerPosition);
    expect(persistPosition).toBeGreaterThan(checkoutPosition);
    expect(authContext).toContain("persistSession = true");
    expect(authContext).toContain("completeAuthResponse: persistAuthResponse");
  });

  it("uses the established subscription checkout return channel", () => {
    expect(registrationScreen).toContain(
      'https://business.azmigrantat.com/subscriptions/start?token=',
    );
    expect(registrationScreen).toContain("await Linking.openURL(checkoutUrl)");
  });

  it("shows the same choice only for a first-time Google registration", () => {
    expect(mobileAuthController).toContain("'is_new_user' => $isNewUser");
    expect(mobileAuthController).toContain("'subscription_plan_choice_pending' => true");
    expect(mobileAuthController).toContain("completeRegistrationPlanChoice");
    expect(authService).toContain("is_new_user?: boolean");
    expect(authService).toContain("requires_subscription_choice?: boolean");
    expect(authService).toContain("completeRegistrationPlanChoiceRequest");
    expect(registrationScreen).toContain("response.isNewUser");
    expect(registrationScreen).toContain("response.requiresPlanChoice");
    expect(registrationScreen).toContain("deferSession");
    expect(googleButton).toContain("onAuthenticated");
    expect(googleButton).toContain("!deferSession");
    expect(loginScreen).toContain("deferSession");
    expect(loginScreen).toContain("onAuthenticated={handleGoogleAuthenticated}");
    expect(loginScreen).toContain("RegistrationPlanChoiceModal");
    expect(loginScreen).toContain("completeRegistrationPlanChoiceRequest");
  });
});
