import { Metadata } from "next";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { websiteName } from "@/lib/utils";
import { MainSidebar } from "@/components/main-sidebar";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { Button } from "@/components/ui/button";
import { getAirportByColumn } from "@/lib/services/airports-service";
import NewAirportForm from "@/app/admin/airports/[id]/airport-form";
import { getCountries } from "@/lib/services/country-service";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    if (id !== "new") {
        const company = await getAirportByColumn("id", id);

        if (company) {
            return {
                title: websiteName("Редактиране на летище"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на ново летище"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function NewCompany({ params }: Params) {
    const { id } = await params;
    let airport = null;

    if (id !== "new") {
        airport = await getAirportByColumn("id", id);
    }

    const countries = await getCountries();

    return (
        <div className="flex">
            <MainSidebar />
            <main className="flex-1">
                <div className="border-b flex items-center gap-5">
                    <h1 className="text-2xl font-semibold p-5">
                        {airport
                            ? "Редактиране на летище"
                            : "Добавяне на ново летище"}
                    </h1>
                    <Link href="/admin/airports/new">
                        <Button variant={"default"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>
                </div>
                <Breadcrumbs
                    items={[
                        { name: "Табло", href: "/admin/dashboard" },
                        { name: "Летища", href: "/admin/airports" },
                        {
                            name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
                        },
                    ]}
                />
                <NewAirportForm airport={airport} countries={countries} />
                {airport?.id && (
                    <>
                        <h2 className="px-5 text-xl font-semibold">
                            Изображение
                        </h2>
                        <ImageUpload
                            imageUrl={airport.image_url as string}
                            url={
                                airport?.id
                                    ? `/api/airports/${airport.id}/upload`
                                    : ""
                            }
                        />
                    </>
                )}
            </main>
        </div>
    );
}
