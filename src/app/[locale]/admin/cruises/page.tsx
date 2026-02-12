import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/[locale]/admin/cruises/client-page";
import { getCruises } from "@/lib/services/cruise-service";
import PageHeader from "@/components/admin/page-header";
import DataTableProvider from "@/components/admin/data-table-provider";
import { columns } from "@/app/[locale]/admin/cruises/columns";

export const metadata: Metadata = {
    title: websiteName("Круизни компании"),
};

export default async function CruisesPage() {
    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Круизни компании", href: "/admin/cruises" },
    ];

    const cruises = await getCruises();

    return (
        <main className="flex-1">
            <PageHeader title="Круизни компании" link="/admin/cruises/new" />
            <Breadcrumbs items={breadcrumbs} />
            <DataTableProvider
                data={cruises}
                columns={columns}
                tableName="cruises"
                onBulkDeleteLink="/api/cruises/bulk-delete"
            />
        </main>
    );
}