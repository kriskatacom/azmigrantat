import { Metadata } from "next";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { websiteName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MainSidebar } from "@/components/main-sidebar";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/admin/landmarks/client-page";
import { Country } from "@/lib/types";
import { getCountryByColumn } from "@/lib/services/country-service";
import { LandmarkWithCountry } from "@/app/admin/landmarks/columns";
import { getLandmarks } from "@/lib/services/landmark-service";

export const metadata: Metadata = {
    title: websiteName("Забележителности"),
};

type EmbassyProps = {
    searchParams: Promise<{
        country: string;
    }>;
};

export default async function Landmarks({ searchParams }: EmbassyProps) {
    const countrySlug = (await searchParams).country;
    let country: Country | null = null;
    let landmarks: LandmarkWithCountry[] = [];

    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Забележителности", href: "/admin/landmarks" },
    ];

    if (countrySlug) {
        country = await getCountryByColumn("slug", countrySlug);
    }

    if (country && country.name) {
        breadcrumbs.push({
            name: country.name,
            href: `/admin/landmarks?country=${country.slug}`,
        });

        landmarks = await getLandmarks({ column: "country_id", value: country.id as number });
    } else {
        landmarks = await getLandmarks();
    }

    return (
        <div className="flex">
            <MainSidebar />

            <main className="flex-1">
                <div className="flex items-center gap-5 border-b">
                    <h1 className="text-2xl font-semibold p-5">Забележителности</h1>
                    <Link href="/admin/landmarks/new">
                        <Button variant={"default"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>
                </div>

                <Breadcrumbs items={breadcrumbs} />

                <ClientPage data={landmarks} />
            </main>
        </div>
    );
}