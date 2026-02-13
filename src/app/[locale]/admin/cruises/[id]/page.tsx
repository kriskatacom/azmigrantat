import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getCruiseByColumn } from "@/lib/services/cruise-service";
import NewCruiseForm from "@/app/[locale]/admin/cruises/[id]/new-cruise-form";
import PageHeader from "@/components/admin/page-header";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    if (id !== "new") {
        const cruise = await getCruiseByColumn("id", id);

        if (cruise) {
            return {
                title: websiteName("Редактиране на круизна компания"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на нова круизна компания"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function cruisePage({ params }: Params) {
    const { id } = await params;
    let cruise = null;

    if (id !== "new") {
        cruise = await getCruiseByColumn("id", id);
    }

    return (
        <main className="flex-1">
            <PageHeader
                title={
                    cruise
                        ? "Редактиране на круизна компании"
                        : "Добавяне на нова круизна компании"
                }
                link="/admin/airlines/new"
            />
            <Breadcrumbs
                items={[
                    { name: "Табло", href: "/admin/dashboard" },
                    { name: "Круизни компании", href: "/admin/cruises" },
                    {
                        name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
                    },
                ]}
            />
            <NewCruiseForm cruise={cruise} />
            {cruise?.id && (
                <>
                    <h2 className="px-5 text-xl font-semibold">Изображение</h2>
                    <ImageUpload
                        image_url={cruise.image_url as string}
                        url={
                            cruise?.id ? `/api/cruises/${cruise.id}/upload` : ""
                        }
                    />
                </>
            )}
        </main>
    );
}