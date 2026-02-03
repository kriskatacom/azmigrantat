import { Metadata } from "next";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { websiteName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import MainSidebarServer from "@/components/main-sidebar/main-sidebar-server";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/admin/airlines/client-page";
import { getAirlines } from "@/lib/services/airline-service";

export const metadata: Metadata = {
    title: websiteName("Авиокомпании"),
};

export default async function Airline() {
    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Авиокомпании", href: "/admin/airlines" },
    ];

    const airlines = await getAirlines();

    return (
        <div className="flex">
            <MainSidebarServer />

            <main className="flex-1">
                <div className="flex items-center gap-5 border-b">
                    <h1 className="text-2xl font-semibold p-5">Авиокомпании</h1>
                    <Link href="/admin/airlines/new">
                        <Button variant={"outline"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>
                </div>

                <Breadcrumbs items={breadcrumbs} />

                <ClientPage data={airlines} />
            </main>
        </div>
    );
}