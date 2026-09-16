export type CompanyProfile = {
  id: number;
  name: string;
  slug: string;
  excerpt?: string | null;
  description?: string | null;
  website_link?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  is_active?: boolean | number;
  options?: { image_url?: string | null } | null;
};

export type CompanySummary = {
  company: CompanyProfile;
  city?: { name?: string | null; slug?: string | null } | null;
  category?: { name?: string | null; slug?: string | null } | null;
  country?: { name?: string | null; slug?: string | null } | null;
};
