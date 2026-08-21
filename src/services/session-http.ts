interface ApiErrorResponse {
  success?: false;
  message?: string;
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
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers ?? {}),
      },
    });

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
    const nextToken = await refreshOnce();

    if (nextToken && nextToken !== token) {
      result = await execute(nextToken);
    }
  }

  if (result.response.status === 401) {
    handlers?.onUnauthorized();
  }

  if (!result.response.ok) {
    throw new Error(
      (result.data as ApiErrorResponse).message ??
        "Възникна грешка при комуникацията със сървъра.",
    );
  }

  return result.data as T;
}
