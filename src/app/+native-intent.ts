function isIncomingCallPath(path: string): boolean {
  try {
    const parsed = path.includes("://")
      ? new URL(path)
      : new URL(path, "chatapp://host");

    return (
      parsed.hostname === "incoming-call" ||
      parsed.pathname.replace(/^\//, "").startsWith("incoming-call")
    );
  } catch {
    return path.includes("incoming-call");
  }
}

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string | null {
  try {
    // Incoming-call intents are handled by VideoCallContext after the tree
    // mounts. Returning null skips Expo Router's async initial-URL setState,
    // which otherwise fires on a navigator that is not mounted yet.
    if (isIncomingCallPath(path)) {
      return null;
    }

    if (new URL(path).hostname === "expo-sharing") {
      return "/share";
    }
  } catch {
    // Keep the original path for non-URL system intents.
  }

  return path;
}
