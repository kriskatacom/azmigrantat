import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getAirportByColumn } from "@/lib/services/airports-service";
import { getCountries } from "@/lib/services/country-service";
import NewAirportForm from "@/app/[locale]/admin/airports/[id]/airport-form";
import PageHeader from "@/components/admin/page-header";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    if (id !== "new") {
        const company = await getAirportByColumn("id", id);

        if (company) {
            return {
                title: websiteName("Редактиране на летище"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на ново летище"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function NewCompany({ params }: Params) {
    const { id } = await params;
    let airport = null;

    if (id !== "new") {
        airport = await getAirportByColumn("id", id);
    }

    const countries = await getCountries();

    return (
        <main className="flex-1">
            <PageHeader
                title={
                    airport
                        ? "Редактиране на летище"
                        : "Добавяне на ново летище"
                }
                link="/admin/airports/new"
            />
            <Breadcrumbs
                items={[
                    { name: "Табло", href: "/admin/dashboard" },
                    { name: "Летища", href: "/admin/airports" },
                    {
                        name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
                    },
                ]}
            />
            <NewAirportForm airport={airport} countries={countries} />
            {airport?.id && (
                <>
                    <h2 className="px-5 text-xl font-semibold">Изображение</h2>
                    <ImageUpload
                        image_url={airport.image_url as string}
                        url={
                            airport?.id
                                ? `/api/airports/${airport.id}/upload`
                                : ""
                        }
                    />
                </>
            )}
        </main>
    );
}
