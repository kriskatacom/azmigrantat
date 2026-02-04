import { Metadata } from "next";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { websiteName } from "@/lib/utils";
import MainSidebarServer from "@/components/main-sidebar/main-sidebar-server";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { Button } from "@/components/ui/button";
import NewTrainForm from "@/app/admin/trains/[id]/new-train-form";
import { getTrainByColumn } from "@/lib/services/train-service";
import { getCountries } from "@/lib/services/country-service";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    if (id !== "new") {
        const train = await getTrainByColumn("id", id);

        if (train) {
            return {
                title: websiteName("Редактиране на гара"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на нова гара"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function NewTrainPage({ params }: Params) {
    const { id } = await params;
    let train = null;

    if (id !== "new") {
        train = await getTrainByColumn("id", id);
    }

    const countries = await getCountries();

    return (
        <div className="flex">
            <MainSidebarServer />
            <main className="flex-1">
                <div className="border-b flex items-center gap-5">
                    <h1 className="text-2xl font-semibold p-5">
                        {train
                            ? "Редактиране на железопътна гара"
                            : "Добавяне на нова железопътна гара"}
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
                        { name: "Железопътни гари", href: "/admin/trains" },
                        {
                            name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
                        },
                    ]}
                />
                <NewTrainForm train={train} countries={countries} />
                {train?.id && (
                    <>
                        <h2 className="px-5 text-xl font-semibold">
                            Изображение
                        </h2>
                        <ImageUpload
                            imageUrl={train.image_url as string}
                            url={
                                train?.id
                                    ? `/api/trains/${train.id}/upload`
                                    : ""
                            }
                        />
                    </>
                )}
            </main>
        </div>
    );
}
