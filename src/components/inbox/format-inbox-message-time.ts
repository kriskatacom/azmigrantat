export function formatInboxMessageTime(date: string | null): string {
  if (!date) return "";

  const messageDate = new Date(date);
  if (Number.isNaN(messageDate.getTime())) return "";

  const now = new Date();
  const isToday =
    messageDate.getFullYear() === now.getFullYear() &&
    messageDate.getMonth() === now.getMonth() &&
    messageDate.getDate() === now.getDate();

  return isToday
    ? messageDate.toLocaleTimeString("bg-BG", { hour: "2-digit", minute: "2-digit" })
    : messageDate.toLocaleDateString("bg-BG", { day: "2-digit", month: "2-digit" });
}
