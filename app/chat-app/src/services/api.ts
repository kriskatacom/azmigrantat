import { toNetworkError } from "@/services/network-guard";
import { parseJsonResponse } from "@/services/http-response";

export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");

if (!API_URL) {
  throw new Error("Липсва EXPO_PUBLIC_API_URL.");
}

export async function api<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  let response: Response;
  const { headers: optionHeaders, ...requestOptions } = options ?? {};

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...requestOptions,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(optionHeaders ?? {}),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw toNetworkError(error);
  }

  const data = await parseJsonResponse<unknown>(
    response,
    "API сървърът върна невалиден отговор.",
  );

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : null;
    throw new Error(
      message
        ? message
        : `Възникна грешка при комуникацията със сървъра (HTTP ${response.status}).`,
    );
  }

  return data as T;
}
