import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import AdditionalImages from "@/components/additional-images";
import { getCountries } from "@/lib/services/country-service";
import { getLandmarkByColumn } from "@/lib/services/landmark-service";
import LandmarkForm from "@/app/[locale]/admin/landmarks/[id]/landmark-form";
import PageHeader from "@/components/admin/page-header";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    if (id !== "new") {
        const landmark = await getLandmarkByColumn("id", id);

        if (landmark) {
            return {
                title: websiteName("Редактиране на забележителността"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на нова забележителност"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function NewCountry({ params }: Params) {
    const { id } = await params;
    let landmark = null;

    if (id !== "new") {
        landmark = await getLandmarkByColumn("id", id);
    }

    const countries = await getCountries();

    const additionalImages = landmark?.additional_images
        ? JSON.parse(landmark.additional_images)
        : null;

    return (
        <main className="flex-1">
            <PageHeader
                title={
                    landmark
                        ? "Редактиране на забележителността"
                        : "Добавяне на нова забележителност"
                }
                link="/admin/landmarks/new"
            />
            <Breadcrumbs
                items={[
                    { name: "Табло", href: "/admin/landmarks" },
                    { name: "Забележителности", href: "/admin/landmarks" },
                    { name: `${id !== "new" ? "Редактиране" : "Добавяне"}` },
                ]}
            />
            <LandmarkForm landmark={landmark} countries={countries} />
            {landmark?.id && (
                <>
                    <h2 className="px-5 text-xl font-semibold">Изображение</h2>
                    <ImageUpload
                        image_url={landmark.image_url as string}
                        url={
                            landmark?.id
                                ? `/api/landmarks/${landmark.id}/upload`
                                : ""
                        }
                    />
                </>
            )}
            {landmark?.id && (
                <>
                    <h2 className="px-5 text-xl font-semibold">
                        Допълнителни изображения
                    </h2>
                    <AdditionalImages
                        image_urls={additionalImages ?? []}
                        url={`/api/landmarks/${landmark.id}/multiple-upload`}
                    />
                </>
            )}
        </main>
    );
}
