import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getAutobusByColumn } from "@/lib/services/autobus-service";
import NewAutobusForm from "./new-autobus-form";
import { getCountries } from "@/lib/services/country-service";
import PageHeader from "@/components/admin/page-header";
import MakeTranslations from "@/components/make-translations";
import {
    TranslationInfo,
    TranslationService,
} from "@/lib/services/translations-service";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    if (id !== "new") {
        const autobus = await getAutobusByColumn("id", id);

        if (autobus) {
            return {
                title: websiteName("Редактиране на автобусна гара"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на ново автобусна гара"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function NewAutobusPage({ params }: Params) {
    const { id } = await params;
    const isNew = id === "new";

    const autobusPromise = !isNew
        ? getAutobusByColumn("id", id)
        : Promise.resolve(null);
    const countriesPromise = getCountries();
    const [autobus, countries] = await Promise.all([
        autobusPromise,
        countriesPromise,
    ]);

    let translationInfo: TranslationInfo = { count: 0, languages: [] };

    if (autobus) {
        const translationService = new TranslationService();

        const [tInfo] = await Promise.all([
            translationService.getAvailableLanguagesForEntity("autobus", id),
        ]);

        translationInfo = tInfo;
    }

    return (
        <main className="flex-1">
            <PageHeader
                title={
                    autobus
                        ? "Редактиране на автобусна гара"
                        : "Добавяне на нова автобусна гара"
                }
                link="/admin/airlines/new"
            />
            <Breadcrumbs
                items={[
                    { name: "Табло", href: "/admin/dashboard" },
                    { name: "Автобусни гари", href: "/admin/autobuses" },
                    {
                        name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
                    },
                ]}
            />
            {autobus?.id && (
                <MakeTranslations
                    entityType="autobus"
                    entityId={autobus.id}
                    translationInfo={translationInfo}
                    fields={[{ value: "name", label: "Име", type: "text" }]}
                    textsToTranslate={[autobus.name || ""]}
                />
            )}
            <NewAutobusForm autobus={autobus} countries={countries} />
            {autobus?.id && (
                <>
                    <h2 className="px-5 text-xl font-semibold">Изображение</h2>
                    <ImageUpload
                        image_url={autobus.image_url as string}
                        url={
                            autobus?.id
                                ? `/api/autobuses/${autobus.id}/upload`
                                : ""
                        }
                        deleteimage_url={
                            autobus?.id
                                ? `/api/autobuses/${autobus.id}/upload`
                                : ""
                        }
                    />
                </>
            )}
        </main>
    );
}
