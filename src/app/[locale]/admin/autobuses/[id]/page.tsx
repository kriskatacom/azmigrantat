import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getAutobusByColumn } from "@/lib/services/autobus-service";
import NewAutobusForm from "./new-autobus-form";
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
        const autobus = await getAutobusByColumn("id", id);

        if (autobus) {
            return {
                title: websiteName("Редактиране на автобусна гара"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на ново автобусна гара"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function NewAutobusPage({ params }: Params) {
    const { id } = await params;
    let autobus = null;

    if (id !== "new") {
        autobus = await getAutobusByColumn("id", id);
    }

    const countries = await getCountries();

    return (
        <main className="flex-1">
            <PageHeader
                title={
                    autobus
                        ? "Редактиране на автобусна гара"
                        : "Добавяне на нова автобусна гара"
                }
                link="/admin/airlines/new"
            />
            <Breadcrumbs
                items={[
                    { name: "Табло", href: "/admin/dashboard" },
                    { name: "Автобусни гари", href: "/admin/autobuses" },
                    {
                        name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
                    },
                ]}
            />
            <NewAutobusForm autobus={autobus} countries={countries} />
            {autobus?.id && (
                <>
                    <h2 className="px-5 text-xl font-semibold">Изображение</h2>
                    <ImageUpload
                        image_url={autobus.image_url as string}
                        url={
                            autobus?.id
                                ? `/api/autobuses/${autobus.id}/upload`
                                : ""
                        }
                    />
                </>
            )}
        </main>
    );
}
