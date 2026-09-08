import { Alert } from "react-native";

export class NetworkError extends Error {
  constructor(message = "Няма интернет връзка.") {
    super(message);
    this.name = "NetworkError";
  }
}

type OfflineListener = (offline: boolean) => void;

const listeners = new Set<OfflineListener>();
let fetchReportedOffline = false;
let installed = false;

export function subscribeFetchConnectivity(listener: OfflineListener): () => void {
  listeners.add(listener);
  listener(fetchReportedOffline);

  return () => {
    listeners.delete(listener);
  };
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true;
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return false;
    }

    return looksLikeNetworkFailure(`${error.name} ${error.message}`);
  }

  return looksLikeNetworkFailure(String(error ?? ""));
}

export function toNetworkError(error: unknown): NetworkError {
  if (error instanceof NetworkError) {
    return error;
  }

  return new NetworkError();
}

export function reportOffline(): void {
  if (fetchReportedOffline) {
    return;
  }

  fetchReportedOffline = true;
  listeners.forEach((listener) => listener(true));
}

export function reportOnline(): void {
  if (!fetchReportedOffline) {
    return;
  }

  fetchReportedOffline = false;
  listeners.forEach((listener) => listener(false));
}

function looksLikeNetworkFailure(value: string): boolean {
  const message = value.toLowerCase();

  return (
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network error") ||
    message.includes("internet connection") ||
    message.includes("connection appears to be offline") ||
    message.includes("the internet connection appears to be offline") ||
    message.includes("could not connect to the server") ||
    message.includes("не може да се свърже") ||
    message.includes("няма интернет") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("eai_again") ||
    message.includes("socket hang up") ||
    message.includes("load failed") ||
    message.includes("request timed out") ||
    message.includes("the request timed out") ||
    message.includes("websocket error") ||
    message.includes("xhr poll error") ||
    message.includes("transport error")
  );
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === "AbortError") ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: string }).name === "AbortError")
  );
}

function notifyListenersIfNeeded(): void {
  listeners.forEach((listener) => listener(fetchReportedOffline));
}

export function installNetworkGuard(): void {
  if (installed) {
    return;
  }

  installed = true;

  const nativeFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input, init) => {
    try {
      const response = await nativeFetch(input, init);
      reportOnline();
      return response;
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      reportOffline();
      throw toNetworkError(error);
    }
  }) as typeof fetch;

  const nativeAlert = Alert.alert.bind(Alert);

  Alert.alert = ((title, message, ...rest) => {
    const combined = `${title ?? ""} ${typeof message === "string" ? message : ""}`;

    if (looksLikeNetworkFailure(combined)) {
      reportOffline();
      return;
    }

    return nativeAlert(title, message, ...rest);
  }) as typeof Alert.alert;

  const promiseRejection = (event: PromiseRejectionEvent) => {
    if (!isNetworkError(event.reason)) {
      return;
    }

    event.preventDefault?.();
    reportOffline();
  };

  if (typeof globalThis.addEventListener === "function") {
    globalThis.addEventListener("unhandledrejection", promiseRejection);
  }

  const errorUtils = (
    globalThis as {
      ErrorUtils?: {
        getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | null;
        setGlobalHandler?: (
          handler: (error: Error, isFatal?: boolean) => void,
        ) => void;
      };
    }
  ).ErrorUtils;

  if (errorUtils?.setGlobalHandler) {
    const previous = errorUtils.getGlobalHandler?.();

    errorUtils.setGlobalHandler((error, isFatal) => {
      if (isNetworkError(error)) {
        reportOffline();
        return;
      }

      previous?.(error, isFatal);
    });
  }

  notifyListenersIfNeeded();
}
