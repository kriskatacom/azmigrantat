import type { AuthResponse, LoginPayload, RegisterPayload } from "@/types/auth";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function loginRequest(
  payload: LoginPayload,
): Promise<AuthResponse> {
  await delay(700);

  // TODO: Замени с истинска заявка към сървъра.
  return {
    token: "demo-access-token",
    user: {
      id: 1,
      firstName: "Демо",
      lastName: "Потребител",
      email: payload.email,
    },
  };
}

export async function registerRequest(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  await delay(700);

  // TODO: Замени с истинска заявка към сървъра.
  return {
    token: "demo-access-token",
    user: {
      id: 1,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
    },
  };
}

export async function logoutRequest(): Promise<void> {
  // TODO: По-късно добави заявка към сървъра.
}
