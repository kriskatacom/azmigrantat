import { Metadata } from "next";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { websiteName } from "@/lib/utils";
import MainSidebarServer from "@/components/main-sidebar/main-sidebar-server";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { Button } from "@/components/ui/button";
import { getCruiseByColumn } from "@/lib/services/cruise-service";
import { getBannerByColumn, getBanners } from "@/lib/services/banner-service";
import { BannerForm } from "./banner-form";

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
        <div className="flex">
            <MainSidebarServer />
            <main className="flex-1">
                <div className="border-b flex items-center gap-5">
                    <h1 className="text-2xl font-semibold p-5">
                        {banner
                            ? "Редактиране на банер"
                            : "Добавяне на нов банер"}
                    </h1>
                    <Link href="/admin/banners/new">
                        <Button variant={"outline"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>
                </div>
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
                        <h2 className="px-5 text-xl font-semibold">
                            Изображение
                        </h2>
                        <ImageUpload
                            image_url={banner.image as string}
                            url={
                                banner?.id
                                    ? `/api/banners/${banner.id}/upload`
                                    : ""
                            }
                        />
                    </>
                )}
            </main>
        </div>
    );
}
