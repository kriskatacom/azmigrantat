import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getCruiseByColumn } from "@/lib/services/cruise-service";
import { getBannerByColumn, getBanners } from "@/lib/services/banner-service";
import { BannerForm } from "./banner-form";
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
                title: websiteName("Редактиране на банер"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на нов банер"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function BannerPage({ params }: Params) {
    const { id } = await params;
    let banner = null;

    if (id !== "new") {
        banner = await getBannerByColumn("id", id);
    }

    return (
        <main className="flex-1">
            <PageHeader
                title={
                    banner ? "Редактиране на банер" : "Добавяне на нов банер"
                }
                link="/admin/banners/new"
            />
            <Breadcrumbs
                items={[
                    { name: "Табло", href: "/admin/dashboard" },
                    { name: "Банери", href: "/admin/banners" },
                    {
                        name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
                    },
                ]}
            />
            <BannerForm banner={banner} isEdit={!!banner?.id} />
            {banner?.id && (
                <>
                    <h2 className="px-5 text-xl font-semibold">Изображение</h2>
                    <ImageUpload
                        image_url={banner.image as string}
                        url={
                            banner?.id ? `/api/banners/${banner.id}/upload` : ""
                        }
                    />
                </>
            )}
        </main>
    );
}
