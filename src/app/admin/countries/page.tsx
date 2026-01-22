import { Metadata } from "next";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { websiteName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MainSidebar } from "@/components/main-sidebar";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/admin/countries/client-page";
import { getCountries } from "@/lib/services/country-service";

export const metadata: Metadata = {
    title: websiteName("Държави"),
};

export default async function Companies() {
    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Държави", href: "/admin/countries" },
    ];

    const countries = await getCountries();

    return (
        <div className="flex">
            <MainSidebar />

            <main className="flex-1">
                <div className="flex items-center gap-5 border-b">
                    <h1 className="text-2xl font-semibold p-5">Държави</h1>
                    <Link href="/admin/countries/new">
                        <Button variant={"default"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>
                </div>

                <Breadcrumbs items={breadcrumbs} />

                <ClientPage data={countries} />
            </main>
        </div>
    );
}