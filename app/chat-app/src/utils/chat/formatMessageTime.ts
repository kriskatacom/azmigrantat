export function formatMessageTime(date?: string | null): string {
  if (!date) {
    return "";
  }

  return new Date(date).toLocaleTimeString("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getMessageDayKey(date?: string | null): string | null {
  if (!date) {
    return null;
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatChatDateLabel(date?: string | null): string {
  if (!date) {
    return "";
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  );
  const diffDays = Math.round(
    (today.getTime() - messageDay.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays === 0) {
    return "Днес";
  }

  if (diffDays === 1) {
    return "Вчера";
  }

  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
  };

  if (parsed.getFullYear() !== now.getFullYear()) {
    options.year = "numeric";
  }

  return parsed.toLocaleDateString("bg-BG", options);
}

