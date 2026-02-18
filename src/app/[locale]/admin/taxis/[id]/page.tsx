import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getTaxiByColumn } from "@/lib/services/taxi-service";
import NewTaxiForm from "./new-taxi-form";
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
        const taxi = await getTaxiByColumn("id", id);

        if (taxi) {
            return {
                title: websiteName("Редактиране на таксиметрова компания"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на нова таксиметрова компания"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function NewTaxiPage({ params }: Params) {
    const { id } = await params;
    const isNew = id === "new";

    const taxiPromise = !isNew
        ? getTaxiByColumn("id", id)
        : Promise.resolve(null);
    const countriesPromise = getCountries();
    const [taxi, countries] = await Promise.all([
        taxiPromise,
        countriesPromise,
    ]);

    let translationInfo: TranslationInfo = { count: 0, languages: [] };

    if (taxi) {
        const translationService = new TranslationService();

        const [tInfo] = await Promise.all([
            translationService.getAvailableLanguagesForEntity("taxi", id),
        ]);

        translationInfo = tInfo;
    }

    return (
        <main className="flex-1">
            <PageHeader
                title={
                    taxi
                        ? "Редактиране на таксиметрова компания"
                        : "Добавяне на нова таксиметрова компания"
                }
                link="/admin/airlines/new"
            />
            <Breadcrumbs
                items={[
                    { name: "Табло", href: "/admin/dashboard" },
                    { name: "Таксиметрова компания", href: "/admin/taxis" },
                    {
                        name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
                    },
                ]}
            />
            {taxi?.id && (
                <MakeTranslations
                    entityType="taxi"
                    entityId={taxi.id}
                    translationInfo={translationInfo}
                    fields={[{ value: "name", label: "Име", type: "text" }]}
                    textsToTranslate={[taxi.name || ""]}
                />
            )}
            <NewTaxiForm taxi={taxi} countries={countries} />
            {taxi?.id && (
                <>
                    <h2 className="px-5 text-xl font-semibold">Изображение</h2>
                    <ImageUpload
                        image_url={taxi.image_url as string}
                        url={taxi?.id ? `/api/taxis/${taxi.id}/upload` : ""}
                    />
                </>
            )}
        </main>
    );
}