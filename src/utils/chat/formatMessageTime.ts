export function formatMessageTime(date?: string | null): string {
  if (!date) {
    return "";
  }

  return new Date(date).toLocaleTimeString("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
