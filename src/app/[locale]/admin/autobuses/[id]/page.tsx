import { Metadata } from "next";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { websiteName } from "@/lib/utils";
import MainSidebarServer from "@/components/main-sidebar/main-sidebar-server";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { Button } from "@/components/ui/button";
import { getAutobusByColumn } from "@/lib/services/autobus-service";
import NewAutobusForm from "./new-autobus-form";
import { getCountries } from "@/lib/services/country-service";

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
        <div className="flex">
            <MainSidebarServer />
            <main className="flex-1">
                <div className="border-b flex items-center gap-5">
                    <h1 className="text-2xl font-semibold p-5">
                        {autobus
                            ? "Редактиране на автобусна гара"
                            : "Добавяне на нова автобусна гара"}
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
                        { name: "Автобусни гари", href: "/admin/autobuses" },
                        {
                            name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
                        },
                    ]}
                />
                <NewAutobusForm autobus={autobus} countries={countries} />
                {autobus?.id && (
                    <>
                        <h2 className="px-5 text-xl font-semibold">
                            Изображение
                        </h2>
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
        </div>
    );
}
