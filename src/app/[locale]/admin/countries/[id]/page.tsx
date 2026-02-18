import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import CountryForm from "@/app/[locale]/admin/countries/[id]/country-form";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import {
    getCountries,
    getCountryByColumn,
} from "@/lib/services/country-service";
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
        const country = await getCountryByColumn("id", id);

        if (country) {
            return {
                title: websiteName("Редактиране на държавата"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на ново държава"),
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

    const countryPromise = !isNew
        ? getCountryByColumn("id", id)
        : Promise.resolve(null);
    const countriesPromise = getCountries();
    const [country, countries] = await Promise.all([
        countryPromise,
        countriesPromise,
    ]);

    let translationInfo: TranslationInfo = { count: 0, languages: [] };

    if (country) {
        const translationService = new TranslationService();

        const [tInfo] = await Promise.all([
            translationService.getAvailableLanguagesForEntity("country", id),
        ]);

        translationInfo = tInfo;
    }

    return (
        <main className="flex-1">
            <PageHeader
                title={
                    country
                        ? "Редактиране на държавата"
                        : "Добавяне на нова държава"
                }
                link="/admin/countries/new"
            />
            <Breadcrumbs
                items={[
                    { name: "Табло", href: "/admin/dashboard" },
                    { name: "Държави", href: "/admin/countries" },
                    {
                        name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
                    },
                ]}
            />
            {country?.id && (
                <MakeTranslations
                    entityType="country"
                    entityId={country.id}
                    translationInfo={translationInfo}
                    fields={[
                        { value: "name", label: "Име", type: "text" },
                        { value: "heading", label: "Заглавие", type: "text" },
                        {
                            value: "excerpt",
                            label: "Описание",
                            type: "wysiwyg",
                        },
                    ]}
                    textsToTranslate={[
                        country.name || "",
                        country.heading || "",
                        country.excerpt || "",
                    ]}
                />
            )}
            <CountryForm country={country} countries={countries} />
            {country?.id && (
                <>
                    <h2 className="px-5 text-xl font-semibold">Изображение</h2>
                    <ImageUpload
                        image_url={country.image_url as string}
                        url={
                            country?.id
                                ? `/api/countries/${country.id}/upload`
                                : ""
                        }
                    />
                </>
            )}
        </main>
    );
}
