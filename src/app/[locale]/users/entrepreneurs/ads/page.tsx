import { Metadata } from "next";
import { redirect } from "next/navigation";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import DataTableProvider from "@/components/admin/data-table-provider";
import { columns } from "@/app/[locale]/users/entrepreneurs/ads/columns";
import { UserService } from "@/lib/services/user-service";
import { AdService } from "@/lib/services/ad-service";
import PageHeader from "@/components/admin/page-header";

export const metadata: Metadata = {
    title: websiteName("Реклами - Табло за предприемачи"),
};

const breadcrumbs: BreadcrumbItem[] = [
    { name: "Табло", href: "/users/entrepreneurs" },
    { name: "Компании", href: "/users/entrepreneurs/companies" },
    { name: "Реклами" },
];

const userService = new UserService();
const adService = new AdService();

export default async function EntrepreneurAds() {
    const user = await userService.getCurrentUser();

    if (!user) {
        return redirect("/");
    }

    const ads = await adService.getAll();

    return (
        <main className="flex-1">
            <PageHeader title="Реклами" link="/users/entrepreneurs/ads/new" />
            <Breadcrumbs items={breadcrumbs} classes="mb-0" />
            <DataTableProvider data={ads} columns={columns} />
        </main>
    );
}