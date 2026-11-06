import { authorizedJson } from "@/services/session-http";

export type ReportTargetType = "user" | "video";
export type ReportReason = "spam" | "harassment" | "hate" | "sexual" | "violence" | "scam" | "privacy" | "other";

export async function reportContent(
  token: string,
  targetType: ReportTargetType,
  targetId: number,
  reason: ReportReason,
): Promise<void> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) throw new Error("Липсва API адрес.");

  await authorizedJson(`${apiUrl}/api/mobile/reports`, token, {
    method: "POST",
    body: JSON.stringify({ target_type: targetType, target_id: targetId, reason }),
  });
}
