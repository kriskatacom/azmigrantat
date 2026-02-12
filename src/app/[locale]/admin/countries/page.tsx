import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/[locale]/admin/countries/client-page";
import { getCountries } from "@/lib/services/country-service";
import PageHeader from "@/components/admin/page-header";
import DataTableProvider from "@/components/admin/data-table-provider";
import { columns } from "@/app/[locale]/admin/countries/columns";

export const metadata: Metadata = {
    title: websiteName("Държави"),
};

export default async function Companies() {
    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Държави", href: "/admin/countries" },
    ];

    const countries = await getCountries();

    return (
        <main className="flex-1">
            <PageHeader title="Държави" link="/admin/countries/new" />
            <Breadcrumbs items={breadcrumbs} />
            <DataTableProvider
                data={countries}
                columns={columns}
                tableName="countries"
                onBulkDeleteLink="/api/countries/bulk-delete"
            />
        </main>
    );
}