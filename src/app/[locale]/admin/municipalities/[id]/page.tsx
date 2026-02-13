import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import NewMunicipaliyForm from "@/app/[locale]/admin/municipalities/[id]/municipality-form";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getCountries } from "@/lib/services/country-service";
import { getMunicipalityByColumn } from "@/lib/services/municipality-service";
import { getCities } from "@/lib/services/city-service";
import PageHeader from "@/components/admin/page-header";

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

export default async function NewCity({ params }: Params) {
    const { id } = await params;
    let municipality = null;

    if (id !== "new") {
        municipality = await getMunicipalityByColumn("id", id);
    }

    const countries = await getCountries();
    const cities = await getCities();

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