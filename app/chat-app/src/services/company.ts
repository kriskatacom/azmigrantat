import type { CompanySummary } from "@/types/company";

const BUSINESS_API_URL = process.env.EXPO_PUBLIC_BUSINESS_API_URL?.replace(/\/$/, "");

type CompanyResponse = {
  success: boolean;
  company: CompanySummary["company"] | null;
  city?: { name?: string | null; slug?: string | null } | null;
  category?: { name?: string | null; slug?: string | null } | null;
  country?: { name?: string | null; slug?: string | null } | null;
};

export async function getCompanyByUser(
  userId: number,
  signal?: AbortSignal,
): Promise<CompanySummary | null> {
  if (!BUSINESS_API_URL || !Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  let response: Response;
  try {
    response = await fetch(`${BUSINESS_API_URL}/admin/companies/user/${userId}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new Error("Компанията не можа да бъде заредена.");
  }

  const rawResponse = await response.text();
  let data: CompanyResponse;
  try {
    data = JSON.parse(rawResponse) as CompanyResponse;
  } catch {
    throw new Error("Business сървърът върна невалиден отговор.");
  }

  if (!response.ok) {
    throw new Error("Компанията не можа да бъде заредена.");
  }

  if (!data.success || !data.company) {
    return null;
  }

  return {
    company: data.company,
    city: data.city,
    category: data.category,
    country: data.country,
  };
}

export function getCompanyImageUrl(summary: CompanySummary): string | null {
  const imagePath = summary.company.options?.image_url?.trim();
  if (!imagePath || !BUSINESS_API_URL) return null;
  return imagePath.startsWith("http")
    ? imagePath
    : `${BUSINESS_API_URL}/${imagePath.replace(/^\/+/, "")}`;
}

export function getCompanyPageUrl(summary: CompanySummary): string | null {
  if (!BUSINESS_API_URL) return null;

  const parts = [
    summary.country?.slug,
    summary.city?.slug,
    summary.category?.slug,
    summary.company.slug,
  ]
    .map((part) => part?.replace(/^\/+|\/+$/g, "").trim())
    .filter(Boolean);

  return parts.length === 4 ? `${BUSINESS_API_URL}/${parts.join("/")}` : null;
}
