import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import Container from "@/components/entrepreneurs/container";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import DataTableProvider from "@/components/admin/data-table-provider";
import { getCompanies } from "@/lib/services/companies-service";
import { columns } from "@/app/[locale]/users/entrepreneurs/companies/columns";
import { UserService } from "@/lib/services/user-service";
import { redirect } from "next/navigation";
import PageHeader from "@/components/admin/page-header";

export const metadata: Metadata = {
    title: websiteName("Компании - Табло за предприемачи"),
};

const breadcrumbs: BreadcrumbItem[] = [
    { name: "Табло", href: "/users/entrepreneurs" },
    { name: "Компании" },
];

const userService = new UserService();

export default async function EntrepreneurCompanies() {
    const user = await userService.getCurrentUser();

    if (!user) {
        return redirect("/");
    }

    const companies = await getCompanies({
        where: [{ column: "user_id", value: user.id }],
    });

    return (
        <main className="flex-1">
            <PageHeader title="Компании" buttonHide />
            <Breadcrumbs items={breadcrumbs} classes="mb-0" />
            <DataTableProvider data={companies} columns={columns} />
        </main>
    );
}
