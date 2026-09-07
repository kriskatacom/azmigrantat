import { toNetworkError } from "@/services/network-guard";

export const API_URL = "https://users.azmigrantat.com";

export async function api<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
      ...options,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw toNetworkError(error);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? "Възникна грешка.");
  }

  return data;
}
