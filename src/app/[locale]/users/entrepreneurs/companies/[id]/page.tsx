import { Metadata } from "next";
import { redirect } from "next/navigation";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import { UserService } from "@/lib/services/user-service";
import PageHeader from "@/components/admin/page-header";
import { getCompanyByColumn } from "@/lib/services/companies-service";
import { SaveForm } from "./save-form";

export const metadata: Metadata = {
    title: websiteName("Обновяване на компания - Табло за предприемачи"),
};

const userService = new UserService();

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export default async function EntrepreneurAdsSave({ params }: Props) {
    const user = await userService.getCurrentUser();

    if (!user) {
        return redirect("/");
    }

    const { id } = await params;

    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/users/entrepreneurs/dashboard" },
        { name: "Компании", href: "/users/entrepreneurs/companies" },
        { name: "Обновяване на компания" },
    ];

    const company = id !== "new" ? await getCompanyByColumn("id", id) : null;

    return (
        <main className="flex-1">
            <PageHeader
                title="Обяви"
                link="/users/entrepreneurs/companies/new"
            />
            <Breadcrumbs items={breadcrumbs} classes="mb-0" />
            {company?.id && (
                <SaveForm company={company} companyId={company.id} />
            )}
        </main>
    );
}
