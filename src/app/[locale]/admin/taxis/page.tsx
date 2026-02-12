import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/[locale]/admin/taxis/client-page";
import { getTaxis } from "@/lib/services/taxi-service";
import PageHeader from "@/components/admin/page-header";
import DataTableProvider from "@/components/admin/data-table-provider";
import { columns } from "@/app/[locale]/admin/taxis/columns";

export const metadata: Metadata = {
    title: websiteName("Таксиметрови компании"),
};

export default async function AutobusesPage() {
    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Таксиметрови компании", href: "/admin/taxis" },
    ];

    const taxis = await getTaxis();

    return (
        <main className="flex-1">
            <PageHeader title="Таксиметрови компании" link="/admin/taxis/new" />
            <Breadcrumbs items={breadcrumbs} />
            <DataTableProvider
                data={taxis}
                columns={columns}
                tableName="taxis"
                onBulkDeleteLink="/api/taxis/bulk-delete"
            />
        </main>
    );
}