import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getTaxiByColumn } from "@/lib/services/taxi-service";
import NewTaxiForm from "./new-taxi-form";
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
    let taxi = null;

    if (id !== "new") {
        taxi = await getTaxiByColumn("id", id);
    }

    const countries = await getCountries();

    return (
        <main className="flex-1">
            <PageHeader
                title={
                    taxi
                        ? "Редактиране на железопътна гара"
                        : "Добавяне на нова железопътна гара"
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
