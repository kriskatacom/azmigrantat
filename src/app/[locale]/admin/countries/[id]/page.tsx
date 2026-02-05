import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import MainSidebarServer from "@/components/main-sidebar/main-sidebar-server";
import CountryForm from "@/app/[locale]/admin/countries/[id]/country-form";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FiPlus } from "react-icons/fi";
import {
    getCountries,
    getCountryByColumn,
} from "@/lib/services/country-service";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    if (id !== "new") {
        const country = await getCountryByColumn("id", id);

        if (country) {
            return {
                title: websiteName("Редактиране на държавата"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на ново държава"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function NewCountry({ params }: Params) {
    const { id } = await params;
    let country = null;

    if (id !== "new") {
        country = await getCountryByColumn("id", id);
    }

    const countries = await getCountries();

    return (
        <div className="flex">
            <MainSidebarServer />
            <main className="flex-1">
                <div className="border-b flex items-center gap-5">
                    <h1 className="text-2xl font-semibold p-5">
                        {country
                            ? "Редактиране на държавата"
                            : "Добавяне на нова държава"}
                    </h1>
                    <Link href="/admin/countries/new">
                        <Button variant={"default"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>
                </div>
                <Breadcrumbs
                    items={[
                        { name: "Табло", href: "/admin/dashboard" },
                        { name: "Държави", href: "/admin/countries" },
                        {
                            name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
                        },
                    ]}
                />
                <CountryForm country={country} countries={countries} />
                {country?.id && (
                    <>
                        <h2 className="px-5 text-xl font-semibold">
                            Изображение
                        </h2>
                        <ImageUpload
                            imageUrl={country.image_url as string}
                            url={
                                country?.id
                                    ? `/api/countries/${country.id}/upload`
                                    : ""
                            }
                        />
                    </>
                )}
            </main>
        </div>
    );
}