import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/[locale]/admin/banners/client-page";
import { getBanners } from "@/lib/services/banner-service";
import PageHeader from "@/components/admin/page-header";

export const metadata: Metadata = {
    title: websiteName("Банери"),
};

export default async function BannersPage() {
    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Банери", href: "/admin/banners" },
    ];

    const banners = await getBanners();

    return (
        <main className="flex-1">
            <PageHeader title="Банери" link="/admin/banners/new" />
            <Breadcrumbs items={breadcrumbs} />
            <ClientPage data={banners} />
        </main>
    );
}