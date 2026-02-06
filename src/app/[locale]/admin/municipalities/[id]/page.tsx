import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import MainSidebarServer from "@/components/main-sidebar/main-sidebar-server";
import NewMunicipaliyForm from "@/app/[locale]/admin/municipalities/[id]/municipality-form";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FiPlus } from "react-icons/fi";
import { getCountries } from "@/lib/services/country-service";
import { getMunicipalityByColumn } from "@/lib/services/municipality-service";
import { getCities } from "@/lib/services/city-service";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    if (id !== "new") {
        const municipality = await getMunicipalityByColumn("id", id);

        if (municipality) {
            return {
                title: websiteName("Редактиране на община"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на нова община"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function NewCity({ params }: Params) {
    const { id } = await params;
    let municipality = null;

    if (id !== "new") {
        municipality = await getMunicipalityByColumn("id", id);
    }

    const countries = await getCountries();
    const cities = await getCities();

    const breadcrumbs = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Общини", href: "/admin/municipalities" },
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
                        {municipality
                            ? "Редактиране на община"
                            : "Добавяне на нова община"}
                    </h1>
                    <Link href="/admin/municipalities/new">
                        <Button variant={"default"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>
                </div>
                <Breadcrumbs items={breadcrumbs} />
                <NewMunicipaliyForm
                    municipality={municipality}
                    countries={countries}
                    cities={cities}
                />
                {municipality?.id && (
                    <>
                        <h2 className="px-5 text-xl font-semibold">
                            Изображение
                        </h2>
                        <ImageUpload
                            imageUrl={municipality.image_url as string}
                            url={
                                municipality?.id
                                    ? `/api/municipalities/${municipality.id}/upload`
                                    : ""
                            }
                        />
                    </>
                )}
            </main>
        </div>
    );
}