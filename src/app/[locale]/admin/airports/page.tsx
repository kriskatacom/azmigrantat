import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/[locale]/admin/airports/client-page";
import { getAirports } from "@/lib/services/airports-service";
import PageHeader from "@/components/admin/page-header";

export const metadata: Metadata = {
    title: websiteName("Летища"),
};

export default async function Airports() {
    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Летища", href: "/admin/airports" },
    ];

    const airports = await getAirports();

    return (
        <main className="flex-1">
            <PageHeader title="Летища" link="/admin/airports/new" />
            <Breadcrumbs items={breadcrumbs} />
            <ClientPage data={airports} />
        </main>
    );
}