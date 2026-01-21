import { Metadata } from "next";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { websiteName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MainSidebar } from "@/components/main-sidebar";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/admin/embassies/client-page";
import { getEmbassies } from "@/lib/services/embassy-service";

export const metadata: Metadata = {
    title: websiteName("Посолства"),
};

type EmbassyProps = {
    searchParams: Promise<{
        country: string;
    }>;
};

export default async function Companies({ searchParams }: EmbassyProps) {
    const countrySlug = (await searchParams).country;

    const embassies = await getEmbassies();

    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Посолства", href: "/admin/embassies" },
    ];

    return (
        <div className="flex">
            <MainSidebar />

            <main className="flex-1">
                <div className="flex items-center gap-5 border-b">
                    <h1 className="text-2xl font-semibold p-5">Посолства</h1>
                    <Link href="/admin/embassies/new">
                        <Button variant={"default"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>
                </div>

                <Breadcrumbs items={breadcrumbs} />

                <ClientPage data={embassies ?? []} />
            </main>
        </div>
    );
}