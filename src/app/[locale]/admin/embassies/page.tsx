import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import { Country } from "@/lib/types";
import { getCountryByColumn } from "@/lib/services/country-service";
import { getEmbassies } from "@/lib/services/embassy-service";
import PageHeader from "@/components/admin/page-header";
import DataTableProvider from "@/components/admin/data-table-provider";
import {
    columns,
    EmbassyWithCountry,
} from "@/app/[locale]/admin/embassies/columns";
import GalleryDialog from "./_components/gallery-dialog";

export const metadata: Metadata = {
    title: websiteName("Посолства"),
};

type EmbassyProps = {
    searchParams: Promise<{
        country: string;
    }>;
};

export default async function Embassies({ searchParams }: EmbassyProps) {
    const countrySlug = (await searchParams).country;
    let country: Country | null = null;
    let embassies: EmbassyWithCountry[] = [];

    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Посолства", href: "/admin/embassies" },
    ];

    if (countrySlug) {
        country = await getCountryByColumn("slug", countrySlug);
    }

    if (country && country.name) {
        breadcrumbs.push({
            name: country.name,
            href: `/admin/embassies?country=${country.slug}`,
        });

        embassies = await getEmbassies({
            column: "country_id",
            value: country.id as number,
        });
    } else {
        embassies = await getEmbassies();
    }

    const allEmbassyIds = embassies.map((l) => l.id);

    return (
        <main className="flex-1">
            <PageHeader title="Посолства" link="/admin/embassies/new" />
            <Breadcrumbs items={breadcrumbs} />

            <DataTableProvider
                key={countrySlug || "all"}
                data={embassies}
                columns={columns}
                tableName="landmarks"
                onBulkDeleteLink="/api/landmarks/bulk-delete"
            />

            <GalleryDialog allEmbassyIds={allEmbassyIds} />
        </main>
    );
}
