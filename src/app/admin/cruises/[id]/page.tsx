import { Metadata } from "next";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { websiteName } from "@/lib/utils";
import MainSidebarServer from "@/components/main-sidebar/main-sidebar-server";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { Button } from "@/components/ui/button";
import { getCruiseByColumn } from "@/lib/services/cruise-service";
import NewCruiseForm from "@/app/admin/cruises/[id]/new-cruise-form";
import { getCountries } from "@/lib/services/country-service";

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

    const countries = await getCountries();

    return (
        <div className="flex">
            <MainSidebarServer />
            <main className="flex-1">
                <div className="border-b flex items-center gap-5">
                    <h1 className="text-2xl font-semibold p-5">
                        {cruise
                            ? "Редактиране на круизна компании"
                            : "Добавяне на нова круизна компании"}
                    </h1>
                    <Link href="/admin/airlines/new">
                        <Button variant={"outline"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>
                </div>
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
                        <h2 className="px-5 text-xl font-semibold">
                            Изображение
                        </h2>
                        <ImageUpload
                            imageUrl={cruise.image_url as string}
                            url={
                                cruise?.id
                                    ? `/api/cruises/${cruise.id}/upload`
                                    : ""
                            }
                        />
                    </>
                )}
            </main>
        </div>
    );
}
