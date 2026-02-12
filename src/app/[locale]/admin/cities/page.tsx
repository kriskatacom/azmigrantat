import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/[locale]/admin/cities/client-page";
import { getCities } from "@/lib/services/city-service";
import { Country } from "@/lib/types";
import { CityWithCountry } from "./columns";
import { getCountryByColumn } from "@/lib/services/country-service";
import PageHeader from "@/components/admin/page-header";

export const metadata: Metadata = {
    title: websiteName("Градове"),
};

type CityProps = {
    searchParams: Promise<{
        country: string;
    }>;
};

export default async function Cities({ searchParams }: CityProps) {
    const countrySlug = (await searchParams).country;
    let country: Country | null = null;
    let cities: CityWithCountry[] = [];

    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Градове", href: "/admin/cities" },
    ];

    if (countrySlug) {
        country = await getCountryByColumn("slug", countrySlug);
    }

    if (country && country.name) {
        breadcrumbs.push({
            name: country.name,
            href: `/admin/cities?country=${country.slug}`,
        });

        cities = await getCities({
            column: "country_id",
            value: country.id as number,
        });
    } else {
        cities = await getCities();
    }

    return (
        <main className="flex-1">
            <PageHeader title="Градове" link="/admin/cities/new"></PageHeader>
            <Breadcrumbs items={breadcrumbs} />
            <ClientPage data={cities} />
        </main>
    );
}
