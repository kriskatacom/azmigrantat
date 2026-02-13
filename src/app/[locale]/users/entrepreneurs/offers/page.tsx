import { Metadata } from "next";
import { redirect } from "next/navigation";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import DataTableProvider from "@/components/admin/data-table-provider";
import { columns } from "@/app/[locale]/users/entrepreneurs/offers/columns";
import { UserService } from "@/lib/services/user-service";
import { OfferService } from "@/lib/services/offer-service";
import PageHeader from "@/components/admin/page-header";

export const metadata: Metadata = {
    title: websiteName("Реклами - Табло за предприемачи"),
};

const breadcrumbs: BreadcrumbItem[] = [
    { name: "Табло", href: "/users/entrepreneurs/dashboard" },
    { name: "Компании", href: "/users/entrepreneurs/companies" },
    { name: "Обяви" },
];

const userService = new UserService();
const offerService = new OfferService();

export default async function EntrepreneurOffers() {
    const user = await userService.getCurrentUser();

    if (!user) {
        return redirect("/");
    }

    const offers = await offerService.getAll();

    return (
        <main className="flex-1">
            <PageHeader title="Обяви" link="/users/entrepreneurs/offers/new" />
            <Breadcrumbs items={breadcrumbs} classes="mb-0" />
            <DataTableProvider data={offers} columns={columns} />
        </main>
    );
}