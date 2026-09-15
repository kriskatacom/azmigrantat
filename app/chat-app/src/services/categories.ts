import { api } from "@/services/api";

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: number | null;
  is_active: boolean;
}

export interface CategoriesResponse {
  items: Category[];
  parent: Category | null;
  breadcrumbs: Pick<Category, "id" | "name">[];
}

/**
 * The API returns root categories when parent_id is omitted. Keeping this
 * request separate makes it easy to add child-category navigation later.
 */
export function getRootCategories(signal?: AbortSignal) {
  return api<CategoriesResponse>("/api/categories", { signal });
}
