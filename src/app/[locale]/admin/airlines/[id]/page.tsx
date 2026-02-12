import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getAirlineByColumn } from "@/lib/services/airline-service";
import NewAirlineForm from "./new-airline-form";
import PageHeader from "@/components/admin/page-header";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    if (id !== "new") {
        const airline = await getAirlineByColumn("id", id);

        if (airline) {
            return {
                title: websiteName("Редактиране на авиокомпания"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на ново авиокомпания"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function NewAirlinePage({ params }: Params) {
    const { id } = await params;
    let airline = null;

    if (id !== "new") {
        airline = await getAirlineByColumn("id", id);
    }

    return (
        <main className="flex-1">
            <PageHeader
                title={
                    airline
                        ? "Редактиране на авиокомпания"
                        : "Добавяне на нова авиокомпания"
                }
                link="/admin/airlines/new"
            />
            <Breadcrumbs
                items={[
                    { name: "Табло", href: "/admin/dashboard" },
                    { name: "Авиокомпании", href: "/admin/airlines" },
                    {
                        name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
                    },
                ]}
            />
            <NewAirlineForm airline={airline} />
            {airline?.id && (
                <>
                    <h2 className="px-5 text-xl font-semibold">Изображение</h2>
                    <ImageUpload
                        image_url={airline.image_url as string}
                        url={
                            airline?.id
                                ? `/api/airlines/${airline.id}/upload`
                                : ""
                        }
                    />
                </>
            )}
        </main>
    );
}