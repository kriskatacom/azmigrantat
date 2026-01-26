import { redirect } from "next/navigation";
import { MainNavbar } from "@/components/main-navbar";
import { CardGrid } from "@/components/card-grid";
import { Breadcrumbs, BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { getCountryByColumn } from "@/lib/services/country-service";
import { getCityByColumn } from "@/lib/services/city-service";
import { CategoryNode, getCategoryTree } from "@/lib/services/category-service";

type PageProps = {
    params: Promise<{
        country: string;
        items?: string[];
    }>;
};

export default async function CityPage({ params }: PageProps) {
    const { country, items = [] } = await params;

    const citySlug = items[0];
    const categoryPath = items.slice(1);

    if (!citySlug) {
        return redirect("/");
    }

    const countryData = await getCountryByColumn("slug", country ?? "");
    const city = await getCityByColumn("slug", citySlug ?? "");

    if (!countryData || !countryData.name || !city || !city.name) {
        return redirect("/");
    }

    const categories = await getCategoryTree();

    const visibleCategories = getCategoryChildren(categories, categoryPath);

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
        { name: city.name, href: `/${countryData.slug}/cities/${city.slug}` },
        ...categoryBreadcrumbs.map((b, index) =>
            index === categoryBreadcrumbs.length - 1
                ? { name: b.name }
                : b,
        ),
    ];

    return (
        <>
            <MainNavbar />

            <div className="text-center bg-website-menu-item py-5 xl:py-10">
                <h1 className="text-light text-2xl xl:text-3xl 2xl:text-4xl font-bold uppercase">
                    Информационен справочник на {city.name}
                </h1>

                <Breadcrumbs
                    items={breadcrumbs}
                    classes="text-light flex justify-center mt-3"
                />
            </div>

            {visibleCategories.length > 0 ? (
                <CardGrid
                    items={visibleCategories}
                    searchPlaceholder="Търсене на категории..."
                    id="categories"
                    isWithSearch
                    loadMoreStep={8}
                    initialVisible={8}
                    hrefPrefix={`/${countryData.slug}/cities/${city.slug}/${categoryPath.join("/")}`}
                    variant="standart"
                />
            ) : (
                <div className="py-5 xl:py-10 text-center text-xl font-semibold">
                    Няма подкатегории
                </div>
            )}
        </>
    );
}

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
