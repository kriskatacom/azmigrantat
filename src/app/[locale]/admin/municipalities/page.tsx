import { Metadata } from "next";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { websiteName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import MainSidebarServer from "@/components/main-sidebar/main-sidebar-server";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/[locale]/admin/municipalities/client-page";
import { getCityByColumn } from "@/lib/services/city-service";
import { City, Country } from "@/lib/types";
import { MunicipalityWithCityAndCountry } from "@/app/[locale]/admin/municipalities/columns";
import {
    getCountries,
    getCountryByColumn,
} from "@/lib/services/country-service";
import { getMunicipalities } from "@/lib/services/municipality-service";
import MunicipalityFilters from "./municipality-filters";

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
        <div className="flex">
            <MainSidebarServer />

            <main className="flex-1">
                <div className="flex items-center gap-5 border-b">
                    <h1 className="text-2xl font-semibold p-5">Общини</h1>
                    <Link href="/admin/municipalities/new">
                        <Button variant={"default"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>
                    <MunicipalityFilters countries={countries} />
                </div>

                <Breadcrumbs items={breadcrumbs} />

                <ClientPage data={municipalities} />
            </main>
        </div>
    );
}
