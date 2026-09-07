import { isNetworkError, toNetworkError } from "@/services/network-guard";

interface ApiErrorResponse {
  success?: false;
  message?: string;
}

export class HttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

type SessionHandlers = {
  refreshAccessToken: () => Promise<string | null>;
  onUnauthorized: () => void;
};

let handlers: SessionHandlers | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function bindAuthSessionHandlers(next: SessionHandlers | null): void {
  handlers = next;
}

async function refreshOnce(): Promise<string | null> {
  if (!handlers) {
    return null;
  }

  if (!refreshInFlight) {
    refreshInFlight = handlers.refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

export async function authorizedJson<T>(
  url: string,
  token: string,
  options: RequestInit = {},
  invalidJsonMessage = "Сървърът върна невалиден JSON:",
): Promise<T> {
  const execute = async (accessToken: string) => {
    let response: Response;

    try {
      response = await fetch(url, {
        ...options,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          ...(options.headers ?? {}),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }

      throw toNetworkError(error);
    }

    const rawResponse = await response.text();
    let data: T | ApiErrorResponse;

    try {
      data = JSON.parse(rawResponse) as T | ApiErrorResponse;
    } catch {
      throw new Error(`${invalidJsonMessage} ${rawResponse.slice(0, 300)}`);
    }

    return { response, data };
  };

  let result = await execute(token);

  if (result.response.status === 401) {
    try {
      const nextToken = await refreshOnce();

      if (nextToken && nextToken !== token) {
        result = await execute(nextToken);
      }
    } catch (error) {
      if (isNetworkError(error)) {
        throw toNetworkError(error);
      }

      throw error;
    }
  }

  if (result.response.status === 401) {
    handlers?.onUnauthorized();
  }

  if (!result.response.ok) {
    throw new HttpError(
      (result.data as ApiErrorResponse).message ??
        "Възникна грешка при комуникацията със сървъра.",
      result.response.status,
    );
  }

  return result.data as T;
}
