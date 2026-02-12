import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import CityForm from "@/app/[locale]/admin/cities/[id]/city-form";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getCityByColumn } from "@/lib/services/city-service";
import { getCountries } from "@/lib/services/country-service";
import PageHeader from "@/components/admin/page-header";

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
    let city = null;

    if (id !== "new") {
        city = await getCityByColumn("id", id);
    }

    const countries = await getCountries();

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