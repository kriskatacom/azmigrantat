import { redirect } from "next/navigation";
import { MainNavbar } from "@/components/main-navbar";
import { CardGrid } from "@/components/card-grid";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getCountryByColumn } from "@/lib/services/country-service";
import { getCityByColumn } from "@/lib/services/city-service";
import {
    CategoryNode,
    getCategoryByColumn,
    getCategoryTree,
} from "@/lib/services/category-service";
import { Banner, Company } from "@/lib/types";
import { getCompanies } from "@/lib/services/companies-service";
import { CardEntity } from "@/components/card-item";
import PageHeader from "@/components/page-header";
import { getBannerByColumn } from "@/lib/services/banner-service";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import AppImage from "@/components/AppImage";
import { websiteName } from "@/lib/utils";

type PageProps = {
    params: Promise<{
        country: string;
        items?: string[];
    }>;
};

export default async function CityPage({ params }: PageProps) {
    const { country, items = [] } = await params;

    /* -----------------------------
     * URL parsing
     * ----------------------------- */
    const citySlug = items[0];
    const categoryPath = items.slice(1);
    const hasCategoryPath = categoryPath.length > 0;

    if (!citySlug) {
        return redirect("/");
    }

    /* -----------------------------
     * Base data
     * ----------------------------- */
    const countryData = await getCountryByColumn("slug", country ?? "");
    const city = await getCityByColumn("slug", citySlug ?? "");
    const categoryData = await getCategoryByColumn(
        "slug",
        categoryPath[0] ?? "",
    );

    if (!countryData || !countryData.name || !city || !city.id || !city.name) {
        return redirect("/");
    }

    /* -----------------------------
     * Categories & breadcrumbs
     * ----------------------------- */
    const categories = await getCategoryTree();
    const visibleCategories = getCategoryChildren(categories, categoryPath);
    const isCategoryListing = visibleCategories.length > 0;

    const baseCityHref = `/${countryData.slug}/cities/${city.slug}`;

    const categoryBreadcrumbs = buildCategoryBreadcrumbs(
        categories,
        categoryPath,
        baseCityHref,
    );

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: countryData.name, href: `/${countryData.slug}` },
        { name: "Градове", href: `/${countryData.slug}/cities` },
        { name: city.name, href: baseCityHref },
        ...categoryBreadcrumbs.map((b, index) =>
            index === categoryBreadcrumbs.length - 1 ? { name: b.name } : b,
        ),
    ];

    const currentCategory = {
        ...categoryBreadcrumbs[categoryBreadcrumbs.length - 1],
        image_url: categoryData?.image_url,
    };

    /* -----------------------------
     * Companies (only on leaf)
     * ----------------------------- */
    let companies: Company[] = [];

    if (!isCategoryListing) {
        const categorySlug = items[items.length - 1];
        const category = await getCategoryByColumn("slug", categorySlug ?? "");

        if (!category || !category.id) {
            return redirect("/");
        }

        companies = await getCompanies({
            where: [
                { column: "city_id", value: city.id },
                { column: "category_id", value: category.id },
            ],
        });
    }

    const mappedCompanies: CardEntity[] = companies.map((company) => ({
        slug: company.slug!,
        name: company.name!,
        imageUrl: company.image_url!,
        excerpt: company.excerpt!,
    }));

    /* -----------------------------
     * Banners (LOGIC UNCHANGED)
     * ----------------------------- */
    const cityBanner = await getBannerByColumn(
        "link",
        `/${countryData.slug}/cities/${city.slug}`,
    );

    let categoryBanner: Banner | null = null;

    if (hasCategoryPath) {
        categoryBanner = await getBannerByColumn(
            "link",
            `/${countryData.slug}/cities/${city.slug}/${categoryPath.join("/")}`,
        );
    }

    let activeBanner = !hasCategoryPath
        ? cityBanner
        : categoryBanner
          ? categoryBanner
          : null;

    if (!activeBanner && currentCategory.image_url) {
        activeBanner = {
            id: 1,
            image: currentCategory.image_url,
            height: 300,
        } as Banner;
    } else if (!activeBanner && city.image_url) {
        activeBanner = { id: 1, image: city.image_url, height: 300 } as Banner;
    }
    /* -----------------------------
     * Page title
     * ----------------------------- */
    const pageTitle = isCategoryListing
        ? (currentCategory?.name ?? `Информационен справочник на ${city.name}`)
        : currentCategory?.name;

    /* -----------------------------
     * Render
     * ----------------------------- */
    return (
        <>
            <MainNavbar />

            <PageHeader
                title={pageTitle}
                breadcrumbs={breadcrumbs}
                banner={activeBanner}
            />

            {isCategoryListing ? (
                <CardGrid
                    items={visibleCategories}
                    searchPlaceholder="Търсене на категории..."
                    id="categories"
                    isWithSearch
                    loadMoreStep={8}
                    initialVisible={8}
                    variant="standart"
                    hrefPrefix={`/${countryData.slug}/cities/${city.slug}/${categoryPath.join("/")}`}
                    columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
                />
            ) : (
                <>
                    <CardGrid
                        items={mappedCompanies}
                        id="companies"
                        searchPlaceholder="Търсене на компании..."
                        isWithSearch
                        loadMoreStep={8}
                        initialVisible={8}
                        variant="modern"
                        hrefPrefix="/companies"
                        columns={{ base: 1, xl: 2, xxl: 3 }}
                    />

                    {companies.length === 0 && (
                        <div className="text-center text-xl font-semibold">
                            Няма намерени компании
                        </div>
                    )}
                </>
            )}
        </>
    );
}

/* ========================================================================
 * Helpers
 * ===================================================================== */

function getCategoryChildren(
    categories: CategoryNode[],
    path: string[],
): CategoryNode[] {
    if (!path.length) return categories;

    const slug = path[0].toLowerCase();
    const current = categories.find((c) => c.slug.toLowerCase() === slug);

    if (!current) return [];

    return getCategoryChildren(current.children, path.slice(1));
}

function buildCategoryBreadcrumbs(
    categories: CategoryNode[],
    path: string[],
    baseHref: string,
): BreadcrumbItem[] {
    const breadcrumbs: BreadcrumbItem[] = [];
    let currentCategories = categories;
    let currentPath: string[] = [];

    for (const slug of path) {
        const category = currentCategories.find(
            (c) => c.slug.toLowerCase() === slug.toLowerCase(),
        );

        if (!category) break;

        currentPath.push(category.slug);

        breadcrumbs.push({
            name: category.name,
            href: `${baseHref}/${currentPath.join("/")}`,
        });

        currentCategories = category.children;
    }

    return breadcrumbs;
}
