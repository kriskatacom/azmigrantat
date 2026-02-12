import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/[locale]/admin/airlines/client-page";
import { getAirlines } from "@/lib/services/airline-service";
import PageHeader from "@/components/admin/page-header";

export const metadata: Metadata = {
    title: websiteName("Авиокомпании"),
};

export default async function Airline() {
    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Авиокомпании", href: "/admin/airlines" },
    ];

    const airlines = await getAirlines();

    return (
        <main className="flex-1">
            <PageHeader title="Авиокомпании" link="/admin/airlines/new" />
            <Breadcrumbs items={breadcrumbs} />
            <ClientPage data={airlines} />
        </main>
    );
}