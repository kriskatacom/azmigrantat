import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getCityByColumn } from "@/lib/services/city-service";
import { City, Country } from "@/lib/types";
import {
    MunicipalityWithCityAndCountry,
    columns,
} from "@/app/[locale]/admin/municipalities/columns";
import {
    getCountries,
    getCountryByColumn,
} from "@/lib/services/country-service";
import { getMunicipalities } from "@/lib/services/municipality-service";
import MunicipalityFilters from "@/app/[locale]/admin/municipalities/municipality-filters";
import PageHeader from "@/components/admin/page-header";
import DataTableProvider from "@/components/admin/data-table-provider";

export const metadata: Metadata = {
    title: websiteName("Общини"),
};

type MunicipalityProps = {
    searchParams: Promise<{
        country: string;
        city: string;
    }>;
};

export default async function Municipalities({
    searchParams,
}: MunicipalityProps) {
    const countrySlug = (await searchParams).country;
    const citySlug = (await searchParams).city;
    let country: Country | null = null;
    let city: City | null = null;
    let municipalities: MunicipalityWithCityAndCountry[] = [];

    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Общини", href: "/admin/municipalities" },
    ];

    if (countrySlug) {
        country = await getCountryByColumn("slug", countrySlug);
    }

    if (citySlug) {
        city = await getCityByColumn("slug", citySlug);
    }

    if (country && country.name && city && city.name) {
        breadcrumbs.push({
            name: country.name,
            href: `/admin/municipalities?country=${country.slug}`,
        });
        breadcrumbs.push({
            name: city.name,
            href: `/admin/municipalities?country=${country.slug}&city=${city.slug}`,
        });

        municipalities = await getMunicipalities({
            where: [
                { column: "country_id", value: country.id },
                { column: "city_id", value: city.id },
            ],
        });
    } else if (country && country.name) {
        breadcrumbs.push({
            name: country.name,
            href: `/admin/municipalities?country=${country.slug}`,
        });

        municipalities = await getMunicipalities({
            where: [{ column: "country_id", value: country.id }],
        });
    } else {
        municipalities = await getMunicipalities();
    }

    const countries = await getCountries();

    return (
        <main className="flex-1">
            <PageHeader title="Общини" link="/admin/municipalities/new">
                <MunicipalityFilters countries={countries} />
            </PageHeader>

            <Breadcrumbs items={breadcrumbs} />
            
            <DataTableProvider
                data={municipalities}
                columns={columns}
                tableName="municipalities"
                onBulkDeleteLink="/api/municipalities/bulk-delete"
            />
        </main>
    );
}
