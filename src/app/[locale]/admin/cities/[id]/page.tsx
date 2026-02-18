import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import CityForm from "@/app/[locale]/admin/cities/[id]/city-form";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getCityByColumn } from "@/lib/services/city-service";
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
        const city = await getCityByColumn("id", id);

        if (city) {
            return {
                title: websiteName("Редактиране на града"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на нов град"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function NewCity({ params }: Params) {
    const { id } = await params;
    const isNew = id === "new";

    const cityPromise = !isNew
        ? getCityByColumn("id", id)
        : Promise.resolve(null);
    const countriesPromise = getCountries();
    const [city, countries] = await Promise.all([
        cityPromise,
        countriesPromise,
    ]);

    let translationInfo: TranslationInfo = { count: 0, languages: [] };

    if (city) {
        const translationService = new TranslationService();

        const [tInfo] = await Promise.all([
            translationService.getAvailableLanguagesForEntity("city", id),
        ]);

        translationInfo = tInfo;
    }

    const breadcrumbs = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Градове", href: "/admin/cities" },
        {
            name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
        },
    ];

    return (
        <main className="flex-1">
            <PageHeader
                title={city ? "Редактиране на града" : "Добавяне на нов град"}
                link="/admin/cities/new"
            />
            <Breadcrumbs items={breadcrumbs} />
            {city?.id && (
                <MakeTranslations
                    entityType="city"
                    entityId={city.id}
                    translationInfo={translationInfo}
                    fields={[
                        { value: "name", label: "Име", type: "text" },
                        {
                            value: "heading",
                            label: "Заглавие на страницата",
                            type: "text",
                        },
                    ]}
                    textsToTranslate={[city.name || "", city.heading || ""]}
                />
            )}
            <CityForm city={city} countries={countries} />
            {city?.id && (
                <>
                    <h2 className="px-5 text-xl font-semibold">Изображение</h2>
                    <ImageUpload
                        image_url={city.image_url as string}
                        url={city?.id ? `/api/cities/${city.id}/upload` : ""}
                    />
                </>
            )}
        </main>
    );
}
