import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import NewMunicipaliyForm from "@/app/[locale]/admin/municipalities/[id]/municipality-form";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getCountries } from "@/lib/services/country-service";
import { getMunicipalityByColumn } from "@/lib/services/municipality-service";
import { getCities } from "@/lib/services/city-service";
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
        const municipality = await getMunicipalityByColumn("id", id);

        if (municipality) {
            return {
                title: websiteName("Редактиране на община"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на нова община"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function NewMunicipality({ params }: Params) {
    const { id } = await params;
    const isNew = id === "new";

    const municipalityPromise = !isNew
        ? getMunicipalityByColumn("id", id)
        : Promise.resolve(null);
    const countriesPromise = getCountries();
    const citiesPromise = getCities();
    const [municipality, countries, cities] = await Promise.all([
        municipalityPromise,
        countriesPromise,
        citiesPromise,
    ]);

    let translationInfo: TranslationInfo = { count: 0, languages: [] };

    if (municipality) {
        const translationService = new TranslationService();

        const [tInfo] = await Promise.all([
            translationService.getAvailableLanguagesForEntity("municipality", id),
        ]);

        translationInfo = tInfo;
    }

    const breadcrumbs = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Общини", href: "/admin/municipalities" },
        {
            name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
        },
    ];

    return (
        <main className="flex-1">
            <PageHeader
                title={
                    municipality
                        ? "Редактиране на община"
                        : "Добавяне на нова община"
                }
                link="/admin/municipalities/new"
            ></PageHeader>

            <Breadcrumbs items={breadcrumbs} />
            {municipality?.id && (
                <MakeTranslations
                    entityType="municipality"
                    entityId={municipality.id}
                    translationInfo={translationInfo}
                    fields={[
                        { value: "name", label: "Име", type: "text" },
                        {
                            value: "heading",
                            label: "Заглавие на страницата",
                            type: "text",
                        },
                    ]}
                    textsToTranslate={[
                        municipality.name || "",
                        municipality.heading || "",
                    ]}
                />
            )}
            <NewMunicipaliyForm
                municipality={municipality}
                countries={countries}
                cities={cities}
            />
            {municipality?.id && (
                <>
                    <h2 className="px-5 text-xl font-semibold">Изображение</h2>
                    <ImageUpload
                        image_url={municipality.image_url as string}
                        url={
                            municipality?.id
                                ? `/api/municipalities/${municipality.id}/upload`
                                : ""
                        }
                    />
                </>
            )}
        </main>
    );
}