import { redirect } from "next/navigation";
import { MainNavbar } from "@/components/main-navbar";
import { CardGrid } from "@/components/card-grid";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { getCountryByColumn } from "@/lib/services/country-service";
import { getCityByColumn } from "@/lib/services/city-service";
import {
    CategoryNode,
    getCategoryByColumn,
    getCategoryTree,
} from "@/lib/services/category-service";
import { Company } from "@/lib/types";
import { getCompanies } from "@/lib/services/companies-service";
import { CardEntity } from "@/components/card-item";
import PageHeader from "@/components/page-header";

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

    if (!countryData || !countryData.name || !city || !city.id || !city.name) {
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
            index === categoryBreadcrumbs.length - 1 ? { name: b.name } : b,
        ),
    ];

    let companies: Company[] = [];

    if (visibleCategories.length === 0) {
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

    return (
        <>
            <MainNavbar />

            <PageHeader
                title={`Информационен справочник на ${city.name}`}
                breadcrumbs={breadcrumbs}
            />

            {visibleCategories.length > 0 ? (
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
                        isWithSearch={true}
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