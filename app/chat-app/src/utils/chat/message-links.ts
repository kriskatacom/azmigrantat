const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const TRAILING_PUNCTUATION = /[.,!?;:)}\]\u00bb"']+$/;

export interface MessagePart {
  value: string;
  url?: string;
}

export function normalizeMessageUrl(value: string): string | null {
  const trimmed = value.replace(TRAILING_PUNCTUATION, "");
  const normalized = /^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed;

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function parseMessageLinks(content: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(URL_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) parts.push({ value: content.slice(lastIndex, index) });

    const rawValue = match[0];
    const url = normalizeMessageUrl(rawValue);
    const linkedValue = url ? rawValue.replace(TRAILING_PUNCTUATION, "") : rawValue;
    parts.push(url ? { value: linkedValue, url } : { value: rawValue });

    const trailingValue = rawValue.slice(linkedValue.length);
    if (trailingValue) parts.push({ value: trailingValue });
    lastIndex = index + rawValue.length;
  }

  if (lastIndex < content.length) parts.push({ value: content.slice(lastIndex) });
  return parts.length > 0 ? parts : [{ value: content }];
}

export function getFirstMessageUrl(content?: string | null): string | null {
  if (!content) return null;
  return parseMessageLinks(content).find((part) => part.url)?.url ?? null;
}
