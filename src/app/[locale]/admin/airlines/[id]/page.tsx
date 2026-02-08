import { Metadata } from "next";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { websiteName } from "@/lib/utils";
import MainSidebarServer from "@/components/main-sidebar/main-sidebar-server";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { Button } from "@/components/ui/button";
import { getAirlineByColumn } from "@/lib/services/airline-service";
import NewAirlineForm from "./new-airline-form";

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
        <div className="flex">
            <MainSidebarServer />
            <main className="flex-1">
                <div className="border-b flex items-center gap-5">
                    <h1 className="text-2xl font-semibold p-5">
                        {airline
                            ? "Редактиране на авиокомпания"
                            : "Добавяне на нова авиокомпания"}
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
                        { name: "Авиокомпании", href: "/admin/airlines" },
                        {
                            name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
                        },
                    ]}
                />
                <NewAirlineForm airline={airline} />
                {airline?.id && (
                    <>
                        <h2 className="px-5 text-xl font-semibold">
                            Изображение
                        </h2>
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
        </div>
    );
}
