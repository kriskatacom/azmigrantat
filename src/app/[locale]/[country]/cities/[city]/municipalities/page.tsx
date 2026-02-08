import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { CardGrid } from "@/components/card-grid";
import { MainNavbar } from "@/components/main-right-navbar";
import PageHeader from "@/components/page-header";
import { getBannerByColumn } from "@/lib/services/banner-service";
import { getCityByColumn } from "@/lib/services/city-service";
import { getCountryByColumn } from "@/lib/services/country-service";
import { getMunicipalities } from "@/lib/services/municipality-service";
import { redirect } from "next/navigation";

type PageProps = {
    params: Promise<{
        country: string;
        city: string;
    }>;
};

export default async function Municipalities({ params }: PageProps) {
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
        { name: city.name, href: `/${countrySlug}/cities/${citySlug}` },
        { name: "Общини" },
    ];

    const banner = await getBannerByColumn(
        "link",
        `${baseCityHref}/municipalities`,
    );

    const municipalities = await getMunicipalities({
        where: [{ column: "city_id", value: city.id }],
    });

    return (
        <main>
            <MainNavbar />
            <PageHeader
                title={`Общини в ${city.name}`}
                breadcrumbs={breadcrumbs}
                banner={banner}
            />
            <CardGrid
                id="municipalities"
                isWithSearch={municipalities.length > 0}
                searchPlaceholder={`Общини в ${city.name}, ${country.name}`}
                items={municipalities}
                variant="standart"
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
                hrefPrefix={baseCityHref}
            />
        </main>
    );
}
