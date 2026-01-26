import { Metadata } from "next";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { websiteName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MainSidebar } from "@/components/main-sidebar";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/admin/cities/client-page";
import { getCities } from "@/lib/services/city-service";
import { Country } from "@/lib/types";
import { CityWithCountry } from "./columns";
import { getCountryByColumn } from "@/lib/services/country-service";

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
        <div className="flex">
            <MainSidebar />

            <main className="flex-1">
                <div className="flex items-center gap-5 border-b">
                    <h1 className="text-2xl font-semibold p-5">Градове</h1>
                    <Link href="/admin/cities/new">
                        <Button variant={"default"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>
                </div>

                <Breadcrumbs items={breadcrumbs} />

                <ClientPage data={cities} />
            </main>
        </div>
    );
}
