import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import NewTrainForm from "@/app/[locale]/admin/trains/[id]/new-train-form";
import { getTrainByColumn } from "@/lib/services/train-service";
import { getCountries } from "@/lib/services/country-service";
import PageHeader from "@/components/admin/page-header";
import {
    TranslationInfo,
    TranslationService,
} from "@/lib/services/translations-service";
import MakeTranslations from "@/components/make-translations";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    if (id !== "new") {
        const train = await getTrainByColumn("id", id);

        if (train) {
            return {
                title: websiteName("Редактиране на гара"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на нова гара"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function NewTrainPage({ params }: Params) {
    const { id } = await params;
    const isNew = id === "new";

    const trainPromise = !isNew
        ? getTrainByColumn("id", id)
        : Promise.resolve(null);
    const countriesPromise = getCountries();
    const [train, countries] = await Promise.all([
        trainPromise,
        countriesPromise,
    ]);

    let translationInfo: TranslationInfo = { count: 0, languages: [] };

    if (train) {
        const translationService = new TranslationService();

        const [tInfo] = await Promise.all([
            translationService.getAvailableLanguagesForEntity("train", id),
        ]);

        translationInfo = tInfo;
    }

    return (
        <main className="flex-1">
            <PageHeader
                title={
                    train
                        ? "Редактиране на железопътна гара"
                        : "Добавяне на нова железопътна гара"
                }
                link="/admin/airlines/new"
            />
            <Breadcrumbs
                items={[
                    { name: "Табло", href: "/admin/dashboard" },
                    { name: "Железопътни гари", href: "/admin/trains" },
                    {
                        name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
                    },
                ]}
            />
            {train?.id && (
                <MakeTranslations
                    entityType="train"
                    entityId={train.id}
                    translationInfo={translationInfo}
                    fields={[{ value: "name", label: "Име", type: "text" }]}
                    textsToTranslate={[train.name || ""]}
                />
            )}
            <NewTrainForm train={train} countries={countries} />
            {train?.id && (
                <>
                    <h2 className="px-5 text-xl font-semibold">Изображение</h2>
                    <ImageUpload
                        image_url={train.image_url as string}
                        deleteimage_url={
                            train?.id ? `/api/trains/${train.id}/upload` : ""
                        }
                        url={train?.id ? `/api/trains/${train.id}/upload` : ""}
                    />
                </>
            )}
        </main>
    );
}
