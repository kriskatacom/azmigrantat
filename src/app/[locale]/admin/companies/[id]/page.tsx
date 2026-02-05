import { Metadata } from "next";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { websiteName } from "@/lib/utils";
import MainSidebarServer from "@/components/main-sidebar/main-sidebar-server";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { Button } from "@/components/ui/button";
import { getCompanyByColumn } from "@/lib/services/companies-service";
import NewCompanyForm from "@/app/[locale]/admin/companies/[id]/company-form";
import { getCountries } from "@/lib/services/country-service";
import AdditionalImages from "@/components/additional-images";
import { getCategories } from "@/lib/services/category-service";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    if (id !== "new") {
        const company = await getCompanyByColumn("id", id);

        if (company) {
            return {
                title: websiteName("Редактиране на компании"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на ново компания"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function NewCompany({ params }: Params) {
    const { id } = await params;
    let company = null;

    if (id !== "new") {
        company = await getCompanyByColumn("id", id);
    }

    const countries = await getCountries();
    const categories = await getCategories();

    const additionalImages = company?.additional_images ? JSON.parse(company.additional_images) : null;

    return (
        <div className="flex">
            <MainSidebarServer />
            <main className="flex-1">
                <div className="border-b flex items-center gap-5">
                    <h1 className="text-2xl font-semibold p-5">
                        {company
                            ? "Редактиране на компании"
                            : "Добавяне на нова компания"}
                    </h1>
                    <Link href="/admin/companies/new">
                        <Button variant={"default"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>
                </div>
                <Breadcrumbs
                    items={[
                        { name: "Табло", href: "/admin/dashboard" },
                        { name: "Държави", href: "/admin/companies" },
                        {
                            name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
                        },
                    ]}
                />
                <NewCompanyForm
                    company={company}
                    countries={countries}
                    categories={categories}
                />
                {company?.id && (
                    <>
                        <h2 className="px-5 text-xl font-semibold">
                            Изображение
                        </h2>
                        <ImageUpload
                            imageUrl={company.image_url as string}
                            url={
                                company?.id
                                    ? `/api/companies/${company.id}/upload`
                                    : ""
                            }
                        />
                        {company?.id && (
                            <>
                                <h2 className="px-5 text-xl font-semibold">
                                    Допълнителни изображения
                                </h2>
                                <AdditionalImages
                                    imageUrls={additionalImages ?? []}
                                    url={`/api/companies/${company.id}/multiple-upload`}
                                />
                            </>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
