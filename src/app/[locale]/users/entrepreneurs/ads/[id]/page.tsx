import { Metadata } from "next";
import { redirect } from "next/navigation";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import { UserService } from "@/lib/services/user-service";
import { AdService } from "@/lib/services/ad-service";
import PageHeader from "@/components/admin/page-header";
import { CreateAndUpdateAdForm } from "./create-and-update-ad-form";
import Upload from "./upload";
import { getCompanies } from "@/lib/services/companies-service";

export const metadata: Metadata = {
    title: websiteName("Реклами - Табло за предприемачи"),
};

const userService = new UserService();
const adService = new AdService();

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
        { name: "Табло", href: "/users/entrepreneurs" },
        { name: "Компании", href: "/users/entrepreneurs/companies" },
        { name: "Реклами", href: "/users/entrepreneurs/ads" },
    ];

    breadcrumbs.push({ name: id === "new" ? "Създаване" : "Редактиране" });

    const ad = id !== "new" ? await adService.getAdsByColumn("id", id) : null;

    const companies = await getCompanies({
        where: [{ column: "user_id", value: user.id }],
    });

    return (
        <main className="flex-1">
            <PageHeader
                title="Реклами"
                link="/users/entrepreneurs/ads/new"
                buttonHide={!ad}
            />
            <Breadcrumbs items={breadcrumbs} classes="mb-0" />
            {ad && <Upload ad={ad} />}
            <CreateAndUpdateAdForm ad={ad} companies={companies} />
        </main>
    );
}