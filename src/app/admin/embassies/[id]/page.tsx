import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import MainSidebarServer from "@/components/main-sidebar/main-sidebar-server";
import EmbassyForm from "@/app/admin/embassies/[id]/embassy-form";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import AdditionalImages from "@/components/additional-images";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FiPlus } from "react-icons/fi";
import { getEmbassyByColumn } from "@/lib/services/embassy-service";
import { getCountries } from "@/lib/services/country-service";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    if (id !== "new") {
        const embassy = await getEmbassyByColumn("id", id);

        if (embassy) {
            return {
                title: websiteName("Редактиране на посолството"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на ново посолство"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function NewCountry({ params }: Params) {
    const { id } = await params;
    let embassy = null;

    if (id !== "new") {
        embassy = await getEmbassyByColumn("id", id);
    }

    const countries = await getCountries();

    return (
        <div className="flex">
            <MainSidebarServer />
            <main className="flex-1">
                <div className="border-b flex items-center gap-5">
                    <h1 className="text-2xl font-semibold p-5">
                        {embassy
                            ? "Редактиране на посолството"
                            : "Добавяне на нов посолство"}
                    </h1>
                    <Link href="/admin/embassies/new">
                        <Button variant={"default"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>
                </div>
                <Breadcrumbs
                    items={[
                        { name: "Табло", href: "/admin/dashboard" },
                        { name: "Посолства", href: "/admin/embassies" },
                        {
                            name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
                        },
                    ]}
                />
                <EmbassyForm embassy={embassy} countries={countries} />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
                    {embassy?.id && (
                        <div>
                            <h2 className="px-5 text-xl font-semibold">
                                Изображение
                            </h2>
                            <ImageUpload
                                imageUrl={embassy.image_url as string}
                                url={
                                    embassy?.id
                                        ? `/api/embassies/${embassy.id}/upload`
                                        : ""
                                }
                            />
                        </div>
                    )}
                    {embassy?.id && (
                        <div>
                            <h2 className="px-5 text-xl font-semibold">
                                Лого на посолството
                            </h2>
                            <ImageUpload
                                imageUrl={
                                    embassy.logo as string
                                }
                                url={
                                    embassy?.id
                                        ? `/api/embassies/${embassy.id}/logo-upload`
                                        : ""
                                }
                            />
                        </div>
                    )}
                    {embassy?.id && (
                        <div>
                            <h2 className="px-5 text-xl font-semibold">
                                Дясна снимка на заглавието на посолството
                            </h2>
                            <ImageUpload
                                imageUrl={
                                    embassy.right_heading_image as string
                                }
                                url={
                                    embassy?.id
                                        ? `/api/embassies/${embassy.id}/right-heading-image-upload`
                                        : ""
                                }
                            />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
