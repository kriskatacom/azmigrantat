import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import MainSidebarServer from "@/components/main-sidebar/main-sidebar-server";
import CityForm from "@/app/[locale]/admin/cities/[id]/city-form";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FiPlus } from "react-icons/fi";
import { getCityByColumn } from "@/lib/services/city-service";
import { getCountries } from "@/lib/services/country-service";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    if (id !== "new") {
        const city = await getCityByColumn("id", id);

        if (city) {
            return {
                title: websiteName("Редактиране на града"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на нов град"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function NewCity({ params }: Params) {
    const { id } = await params;
    let city = null;

    if (id !== "new") {
        city = await getCityByColumn("id", id);
    }

    const countries = await getCountries();

    const breadcrumbs = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Градове", href: "/admin/cities" },
        {
            name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
        },
    ];

    return (
        <div className="flex">
            <MainSidebarServer />
            <main className="flex-1">
                <div className="border-b flex items-center gap-5">
                    <h1 className="text-2xl font-semibold p-5">
                        {city ? "Редактиране на града" : "Добавяне на нов град"}
                    </h1>
                    <Link href="/admin/cities/new">
                        <Button variant={"default"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>
                </div>
                <Breadcrumbs items={breadcrumbs} />
                <CityForm city={city} countries={countries} />
                {city?.id && (
                    <>
                        <h2 className="px-5 text-xl font-semibold">
                            Изображение
                        </h2>
                        <ImageUpload
                            imageUrl={city.image_url as string}
                            url={
                                city?.id ? `/api/cities/${city.id}/upload` : ""
                            }
                        />
                    </>
                )}
            </main>
        </div>
    );
}