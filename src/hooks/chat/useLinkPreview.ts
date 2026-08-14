import { getLinkPreview } from "@/services/chat";
import type { LinkPreview } from "@/types/chat";
import { useEffect, useState } from "react";

const previewCache = new Map<string, LinkPreview | null>();

export function useLinkPreview(
  token: string | null | undefined,
  url: string | null,
) {
  const [preview, setPreview] = useState<LinkPreview | null>(() =>
    url ? (previewCache.get(url) ?? null) : null,
  );

  useEffect(() => {
    if (!token || !url) {
      setPreview(null);
      return;
    }
    if (previewCache.has(url)) {
      setPreview(previewCache.get(url) ?? null);
      return;
    }

    const controller = new AbortController();
    void getLinkPreview(token, url, controller.signal)
      .then((result) => {
        previewCache.set(url, result);
        setPreview(result);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Link preview error:", error);
        setPreview(null);
      });

    return () => controller.abort();
  }, [token, url]);

  return preview;
}
