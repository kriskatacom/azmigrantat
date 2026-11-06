export type VideoPlaybackFailureReason = "forbidden" | "source_error";

export function classifyVideoPlaybackError(error: unknown): VideoPlaybackFailureReason {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";

  return /(?:response\s+code|http(?:\s+status)?)\s*:?\s*403\b/i.test(message)
    ? "forbidden"
    : "source_error";
}
