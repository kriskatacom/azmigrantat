import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import EmbassyForm from "@/app/[locale]/admin/embassies/[id]/embassy-form";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getEmbassyByColumn } from "@/lib/services/embassy-service";
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
        const embassy = await getEmbassyByColumn("id", id);

        if (embassy) {
            return {
                title: websiteName("Редактиране на посолството"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на ново посолство"),
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
    const embassyPromise = !isNew
        ? getEmbassyByColumn("id", id)
        : Promise.resolve(null);

    const [embassy, countries] = await Promise.all([
        embassyPromise,
        countriesPromise,
    ]);

    let translationInfo: TranslationInfo = { count: 0, languages: [] };

    if (embassy) {
        const translationService = new TranslationService();

        const [tInfo] = await Promise.all([
            translationService.getAvailableLanguagesForEntity("embassy", id),
        ]);

        translationInfo = tInfo;
    }

    return (
        <main className="flex-1">
            <PageHeader
                title={
                    embassy
                        ? "Редактиране на посолството"
                        : "Добавяне на нов посолство"
                }
                link="/admin/embassies/new"
            />
            <Breadcrumbs
                items={[
                    { name: "Табло", href: "/admin/dashboard" },
                    { name: "Посолства", href: "/admin/embassies" },
                    {
                        name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
                    },
                ]}
            />
            {embassy?.id && (
                <MakeTranslations
                    entityType="embassy"
                    entityId={embassy.id}
                    translationInfo={translationInfo}
                    fields={[
                        { value: "name", label: "Име", type: "text" },
                        { value: "heading", label: "Заглавие", type: "text" },
                        {
                            value: "working_time",
                            label: "Работно време",
                            type: "wysiwyg",
                        },
                        {
                            value: "content",
                            label: "Описание",
                            type: "wysiwyg",
                        },
                        { value: "address", label: "Адрес", type: "text" },
                    ]}
                    textsToTranslate={[
                        embassy.name || "",
                        embassy.heading || "",
                        embassy.working_time || "",
                        embassy.content || "",
                        embassy.address || "",
                    ]}
                />
            )}
            <EmbassyForm embassy={embassy} countries={countries} />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
                {embassy?.id && (
                    <div>
                        <h2 className="px-5 text-xl font-semibold">
                            Изображение
                        </h2>
                        <ImageUpload
                            image_url={embassy.image_url as string}
                            url={
                                embassy?.id
                                    ? `/api/embassies/${embassy.id}/upload`
                                    : ""
                            }
                        />
                    </div>
                )}
                {embassy?.id && (
                    <div>
                        <h2 className="px-5 text-xl font-semibold">
                            Лого на посолството
                        </h2>
                        <ImageUpload
                            image_url={embassy.logo as string}
                            url={
                                embassy?.id
                                    ? `/api/embassies/${embassy.id}/logo-upload`
                                    : ""
                            }
                        />
                    </div>
                )}
                {embassy?.id && (
                    <div>
                        <h2 className="px-5 text-xl font-semibold">
                            Дясна снимка на заглавието на посолството
                        </h2>
                        <ImageUpload
                            image_url={embassy.right_heading_image as string}
                            url={
                                embassy?.id
                                    ? `/api/embassies/${embassy.id}/right-heading-image-upload`
                                    : ""
                            }
                        />
                    </div>
                )}
            </div>
        </main>
    );
}
