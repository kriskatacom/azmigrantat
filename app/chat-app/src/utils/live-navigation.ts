import { useRouter } from "expo-router";

type Router = ReturnType<typeof useRouter>;

export function goToLiveCatalog(router: Router): void {
  queueMicrotask(() => {
    if (router.canDismiss()) {
      router.dismissTo("/live");
      return;
    }

    router.replace("/live");
  });
}

export function runAfterFocus(action: () => void): () => void {
  let cancelled = false;
  const frame = requestAnimationFrame(() => {
    if (!cancelled) {
      action();
    }
  });

  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
  };
}
