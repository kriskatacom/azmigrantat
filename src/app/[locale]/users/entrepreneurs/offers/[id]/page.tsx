import { Metadata } from "next";
import { redirect } from "next/navigation";
import { websiteName } from "@/lib/utils";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import { UserService } from "@/lib/services/user-service";
import PageHeader from "@/components/admin/page-header";
import { CreateAndUpdateOfferForm } from "@/app/[locale]/users/entrepreneurs/offers/[id]/create-and-update-offer-form";
import Upload from "@/app/[locale]/users/entrepreneurs/offers/[id]/upload";
import { getCompanies } from "@/lib/services/companies-service";
import { OfferService } from "@/lib/services/offer-service";

export const metadata: Metadata = {
    title: websiteName("Реклами - Табло за предприемачи"),
};

const userService = new UserService();
const offerService = new OfferService();

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
        { name: "Обяви", href: "/users/entrepreneurs/offers" },
    ];

    breadcrumbs.push({ name: id === "new" ? "Създаване" : "Редактиране" });

    const offer =
        id !== "new" ? await offerService.getOfferByColumn("id", id) : null;

    const companies = await getCompanies({
        where: [{ column: "user_id", value: user.id }],
    });

    return (
        <main className="flex-1">
            <PageHeader
                title="Обяви"
                link="/users/entrepreneurs/offers/new"
                buttonHide={!offer}
            />
            <Breadcrumbs items={breadcrumbs} classes="mb-0" />
            {offer && <Upload offer={offer} />}
            <CreateAndUpdateOfferForm offer={offer} companies={companies} />
        </main>
    );
}
