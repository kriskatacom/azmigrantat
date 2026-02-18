import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getCruiseByColumn } from "@/lib/services/cruise-service";
import { getBannerByColumn, getBanners } from "@/lib/services/banner-service";
import { BannerForm } from "./banner-form";
import PageHeader from "@/components/admin/page-header";
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
        const cruise = await getCruiseByColumn("id", id);

        if (cruise) {
            return {
                title: websiteName("Редактиране на банер"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на нов банер"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function BannerPage({ params }: Params) {
    const { id } = await params;
    const isNew = id === "new";

    const bannerPromise = !isNew
        ? getBannerByColumn("id", id)
        : Promise.resolve(null);
    const [banner] = await Promise.all([
        bannerPromise,
    ]);

    let translationInfo: TranslationInfo = { count: 0, languages: [] };

    if (banner) {
        const translationService = new TranslationService();

        const [tInfo] = await Promise.all([
            translationService.getAvailableLanguagesForEntity("banner", id),
        ]);

        translationInfo = tInfo;
    }

    return (
        <main className="flex-1">
            <PageHeader
                title={
                    banner ? "Редактиране на банер" : "Добавяне на нов банер"
                }
                link="/admin/banners/new"
            />
            <Breadcrumbs
                items={[
                    { name: "Табло", href: "/admin/dashboard" },
                    { name: "Банери", href: "/admin/banners" },
                    {
                        name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
                    },
                ]}
            />
            {banner?.id && (
                <MakeTranslations
                    entityType="banner"
                    entityId={banner.id}
                    translationInfo={translationInfo}
                    fields={[
                        { value: "name", label: "Име", type: "text" },
                        {
                            value: "button_text",
                            label: "Текст на бутона",
                            type: "text",
                        },
                        {
                            value: "description",
                            label: "Описание",
                            type: "wysiwyg",
                        },
                    ]}
                    textsToTranslate={[
                        banner.name || "",
                        banner.button_text || "",
                        banner.description || "",
                    ]}
                />
            )}
            <BannerForm banner={banner} isEdit={!!banner?.id} />
            {banner?.id && (
                <>
                    <h2 className="px-5 text-xl font-semibold">Изображение</h2>
                    <ImageUpload
                        image_url={banner.image as string}
                        url={
                            banner?.id ? `/api/banners/${banner.id}/upload` : ""
                        }
                    />
                </>
            )}
        </main>
    );
}
