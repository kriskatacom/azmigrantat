import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getCompanyByColumn } from "@/lib/services/companies-service";
import NewCompanyForm from "@/app/[locale]/admin/companies/[id]/company-form";
import { getCountries } from "@/lib/services/country-service";
import { getCategories } from "@/lib/services/category-service";
import PageHeader from "@/components/admin/page-header";

export type ImageField =
    | "image_url"
    | "offer_image_url"
    | "ads_image_url"
    | "bottom_image_url";

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

    return (
        <main className="flex-1">
            <PageHeader
                title={
                    company
                        ? "Редактиране на компании"
                        : "Добавяне на нова компания"
                }
                link="/admin/companies/new"
            />

            <Breadcrumbs
                items={[
                    { name: "Табло", href: "/admin/dashboard" },
                    { name: "Компании", href: "/admin/companies" },
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
                    <h2 className="px-5 text-xl font-semibold">Изображение</h2>
                    <ImageUpload
                        image_url={company.image_url as string}
                        url={
                            company?.id
                                ? `/api/companies/${company.id}/upload?image_to_update=image_url`
                                : ""
                        }
                        additionalFormData={[
                            { name: "image_to_update", value: "image_url" },
                        ]}
                    />
                    <h2 className="px-5 text-xl font-semibold">
                        Изображение на обявите
                    </h2>
                    <ImageUpload
                        image_url={company.offer_image_url as string}
                        url={
                            company?.id
                                ? `/api/companies/${company.id}/upload`
                                : ""
                        }
                        additionalFormData={[
                            {
                                name: "image_to_update",
                                value: "offer_image_url",
                            },
                        ]}
                    />
                    <h2 className="px-5 text-xl font-semibold">
                        Изображение на рекламите
                    </h2>
                    <ImageUpload
                        image_url={company.ads_image_url as string}
                        url={
                            company?.id
                                ? `/api/companies/${company.id}/upload`
                                : ""
                        }
                        additionalFormData={[
                            { name: "image_to_update", value: "ads_image_url" },
                        ]}
                    />
                    <h2 className="px-5 text-xl font-semibold">
                        Изображение на отдолу
                    </h2>
                    <ImageUpload
                        image_url={company.bottom_image_url as string}
                        url={
                            company?.id
                                ? `/api/companies/${company.id}/upload`
                                : ""
                        }
                        additionalFormData={[
                            {
                                name: "image_to_update",
                                value: "bottom_image_url",
                            },
                        ]}
                    />
                </>
            )}
        </main>
    );
}
