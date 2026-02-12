import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/[locale]/admin/trains/client-page";
import { getTrains } from "@/lib/services/train-service";
import PageHeader from "@/components/admin/page-header";

export const metadata: Metadata = {
    title: websiteName("Железопътни гари"),
};

export default async function TrainsPage() {
    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Железопътни гари", href: "/admin/trains" },
    ];

    const trains = await getTrains();

    return (
        <main className="flex-1">
            <PageHeader
                title="Железопътни гари"
                link="/admin/trains/new"
            />
            <Breadcrumbs items={breadcrumbs} />
            <ClientPage data={trains} />
        </main>
    );
}