import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import AdditionalImages from "@/components/additional-images";
import { getCountries } from "@/lib/services/country-service";
import { getLandmarkByColumn } from "@/lib/services/landmark-service";
import LandmarkForm from "@/app/[locale]/admin/landmarks/[id]/landmark-form";
import PageHeader from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import MakeTranslations from "@/components/make-translations";
import { TranslationInfo, TranslationService } from "@/lib/services/translations-service";

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
    const isNew = id === "new";

    const countriesPromise = getCountries();
    const landmarkPromise = !isNew
        ? getLandmarkByColumn("id", id)
        : Promise.resolve(null);

    const [landmark, countries] = await Promise.all([
        landmarkPromise,
        countriesPromise,
    ]);

    let translationInfo: TranslationInfo = { count: 0, languages: [] };
    let additionalImages = null;

    if (landmark) {
        const translationService = new TranslationService();

        const [tInfo] = await Promise.all([
            translationService.getAvailableLanguagesForEntity("landmark", id),
        ]);

        translationInfo = tInfo;

        try {
            additionalImages = landmark.additional_images
                ? JSON.parse(landmark.additional_images)
                : [];
        } catch (e) {
            console.error("Failed to parse images:", e);
            additionalImages = [];
        }
    }

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
            {landmark?.id && (
                <MakeTranslations
                    entityType="landmark"
                    entityId={landmark.id}
                    translationInfo={translationInfo}
                    fields={[
                        { value: "name", label: "Име", type: "text" },
                        { value: "heading", label: "Заглавие", type: "text" },
                        {
                            value: "content",
                            label: "Описание",
                            type: "wysiwyg",
                        },
                        { value: "address", label: "Адрес", type: "text" },
                    ]}
                    textsToTranslate={[
                        landmark.name || "",
                        landmark.heading || "",
                        landmark.content || "",
                        landmark.address || "",
                    ]}
                />
            )}
            <LandmarkForm landmark={landmark} countries={countries} />
            <Card className="mt-5 mx-5">
                {landmark?.id && (
                    <>
                        <h2 className="px-5 text-xl font-semibold">
                            Изображение
                        </h2>
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
            </Card>
            <Card className="mt-5 mx-5">
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
            </Card>
        </main>
    );
}
