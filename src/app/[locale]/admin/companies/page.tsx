import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/[locale]/admin/companies/client-page";
import { getCompanies } from "@/lib/services/companies-service";
import PageHeader from "@/components/admin/page-header";

export const metadata: Metadata = {
    title: websiteName("Компании"),
};

export default async function Companies() {
    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Компании", href: "/admin/companies" },
    ];

    const companies = await getCompanies();

    return (
        <main className="flex-1">
            <PageHeader title="Компании" link="/admin/companies/new"></PageHeader>
            <Breadcrumbs items={breadcrumbs} />
            <ClientPage data={companies} />
        </main>
    );
}