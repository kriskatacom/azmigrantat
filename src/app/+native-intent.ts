export async function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): Promise<string> {
  try {
    if (new URL(path).hostname === "expo-sharing") {
      return "/share";
    }
  } catch {
    // Keep the original path for non-URL system intents.
  }

  return path;
}
