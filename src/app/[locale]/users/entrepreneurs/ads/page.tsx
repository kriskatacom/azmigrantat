import { Metadata } from "next";
import { redirect } from "next/navigation";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import DataTableProvider from "@/components/admin/data-table-provider";
import { columns } from "@/app/[locale]/users/entrepreneurs/ads/columns";
import { UserService } from "@/lib/services/user-service";
import { AdService, AdStatus } from "@/lib/services/ad-service";
import PageHeader from "@/components/admin/page-header";

export const metadata: Metadata = {
    title: websiteName("Реклами - Табло за предприемачи"),
};

const userService = new UserService();
const adService = new AdService();

type Props = {
    searchParams: Promise<{
        status: string;
    }>;
};

export default async function EntrepreneurAds({ searchParams }: Props) {
    const { status } = await searchParams;

    const user = await userService.getCurrentUser();

    if (!user) {
        return redirect("/");
    }

    const ads = (status as AdStatus)
        ? await adService.getAll({ status: "active" })
        : await adService.getAll();

    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/users/entrepreneurs/dashboard" },
        { name: "Компании", href: "/users/entrepreneurs/companies" },
        {
            name: "Реклами",
            href: status === "active" ? "/users/entrepreneurs/ads" : undefined,
        },
    ];

    if (status === "active") {
        breadcrumbs.push({ name: "Активирани" });
    }

    return (
        <main className="flex-1">
            <PageHeader title="Реклами" link="/users/entrepreneurs/ads/new" />
            <Breadcrumbs items={breadcrumbs} classes="mb-0" />
            <DataTableProvider data={ads} columns={columns} />
        </main>
    );
}