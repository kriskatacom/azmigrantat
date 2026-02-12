import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/[locale]/admin/autobuses/client-page";
import { getAutobuses } from "@/lib/services/autobus-service";
import PageHeader from "@/components/admin/page-header";

export const metadata: Metadata = {
    title: websiteName("Автобусни гари"),
};

export default async function AutobusesPage() {
    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Автобусни гари", href: "/admin/autobuses" },
    ];

    const autobuses = await getAutobuses();

    return (
        <main className="flex-1">
            <PageHeader title="Автобусни гари" link="/admin/autobuses/new" />
            <Breadcrumbs items={breadcrumbs} />
            <ClientPage data={autobuses} />
        </main>
    );
}