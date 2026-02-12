import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/[locale]/admin/landmarks/client-page";
import { Country } from "@/lib/types";
import { getCountryByColumn } from "@/lib/services/country-service";
import { getLandmarks } from "@/lib/services/landmark-service";
import PageHeader from "@/components/admin/page-header";
import DataTableProvider from "@/components/admin/data-table-provider";
import {
    columns,
    LandmarkWithCountry,
} from "@/app/[locale]/admin/landmarks/columns";

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

        landmarks = await getLandmarks({
            column: "country_id",
            value: country.id as number,
        });
    } else {
        landmarks = await getLandmarks();
    }

    return (
        <main className="flex-1">
            <PageHeader title="Забележителности" link="/admin/landmarks/new" />
            <Breadcrumbs items={breadcrumbs} />
            <DataTableProvider
                data={landmarks}
                columns={columns}
                tableName="landmarks"
                onBulkDeleteLink="/api/landmarks/bulk-delete"
            />
        </main>
    );
}
