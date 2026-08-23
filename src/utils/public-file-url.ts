const CDN_BASE = "https://cdn.azmigrantat.com";
const FALLBACK_BASE = (
  process.env.EXPO_PUBLIC_B2_FALLBACK_BASE_URL ||
  "https://f003.backblazeb2.com/file/azmigrantat-bucket"
).replace(/\/+$/, "");

function isLocalUri(url: string): boolean {
  return /^(file|content|data|ph|assets-library|asset):/i.test(url);
}

function extractObjectKey(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^\/+/, "");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.replace(/^\/+/, "");

  if (host === "cdn.azmigrantat.com") {
    return path || null;
  }

  const pathMatch = parsed.searchParams.get("path");
  if (
    pathMatch &&
    (host.endsWith("azmigrantat.com") ||
      host.includes("backblazeb2.com") ||
      host.includes("backblaze.com"))
  ) {
    return pathMatch.replace(/^\/+/, "");
  }

  const friendly = path.match(/^file\/[^/]+\/(.+)$/);
  if (friendly) {
    return friendly[1];
  }

  if (host.includes("backblazeb2.com") || host.includes("backblaze.com")) {
    const bucketAndKey = path.match(/^[^/]+\/(.+)$/);
    if (bucketAndKey) {
      return bucketAndKey[1];
    }
  }

  return null;
}

export function toPublicFileUrl(
  url: string | null | undefined,
): string | null {
  if (typeof url !== "string") {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  if (isLocalUri(trimmed)) {
    return trimmed;
  }

  const key = extractObjectKey(trimmed);
  if (!key) {
    return trimmed;
  }

  return `${CDN_BASE}/${key}`;
}

export function toFallbackFileUrl(
  url: string | null | undefined,
): string | null {
  if (typeof url !== "string") {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  if (isLocalUri(trimmed)) {
    return trimmed;
  }

  const key = extractObjectKey(trimmed);
  if (!key) {
    return null;
  }

  return `${FALLBACK_BASE}/${key}`;
}

export function isUnresolvableHostError(message: string): boolean {
  return /unknownhostexception|unable to resolve host|no address associated with hostname|name not resolved/i.test(
    message,
  );
}
