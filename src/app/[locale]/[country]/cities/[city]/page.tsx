import { redirect } from "next/navigation";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { CardGrid } from "@/components/card-grid";
import { MainNavbar } from "@/components/main-navbar";
import { getBannerByColumn } from "@/lib/services/banner-service";
import { getCategories } from "@/lib/services/category-service";
import { getCityByColumn } from "@/lib/services/city-service";
import { getCountryByColumn } from "@/lib/services/country-service";
import CustomHeader from "@/app/[locale]/[country]/cities/[city]/custom-header";
import { Banner } from "@/lib/types";

type PageProps = {
    params: Promise<{
        country: string;
        city: string;
    }>;
};

export default async function CityPage({ params }: PageProps) {
    const { country: countrySlug, city: citySlug } = await params;

    const country = await getCountryByColumn("slug", countrySlug);
    const city = await getCityByColumn("slug", citySlug);

    if (!country || !country.name || !city || !city.name) {
        return redirect("/");
    }

    const baseCityHref = `/${countrySlug}/cities/${citySlug}`;

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: country.name, href: `/${countrySlug}` },
        { name: "Градове", href: `/${countrySlug}/cities` },
        { name: city.name },
    ];

    let activeBanner;

    if (city.image_url) {
        activeBanner = { id: 1, image: city.image_url, height: 300 };
    } else {
        activeBanner = await getBannerByColumn("link", baseCityHref);
    }

    const municipalitiesBanner = await getBannerByColumn(
        "link",
        `${baseCityHref}/municipalities`,
    );

    const categories = await getCategories({ where: { parent_id: null } });

    return (
        <main>
            <MainNavbar />
            <div className="block lg:hidden">
                <CardGrid
                    id="municipalities-banner"
                    items={[
                        {
                            name: "Общински градове",
                            slug: `municipalities`,
                            imageUrl: municipalitiesBanner?.image,
                        },
                    ]}
                    variant="standart"
                    columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
                    hrefPrefix={baseCityHref}
                />
            </div>
            <div className="hidden lg:block">
                <CustomHeader
                    title={`Информационен справочник на ${city.name}`}
                    breadcrumbs={breadcrumbs}
                    banner={activeBanner}
                    municipalitiesLink={`${baseCityHref}/municipalities`}
                />
            </div>
            <div className="block lg:hidden">
                <CustomHeader
                    title={`Информационен справочник на ${city.name}`}
                    breadcrumbs={breadcrumbs}
                />
            </div>
            <CardGrid
                id="categories"
                isWithSearch
                searchPlaceholder={`Търсене на категории в ${city.name}`}
                items={categories}
                variant="standart"
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
                hrefPrefix={baseCityHref}
            />
        </main>
    );
}