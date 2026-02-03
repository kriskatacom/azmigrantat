import { Metadata } from "next";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { websiteName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MainSidebar } from "@/components/main-sidebar";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/admin/airports/client-page";
import { getAirports } from "@/lib/services/airports-service";

export const metadata: Metadata = {
    title: websiteName("Летища"),
};

export default async function Airports() {
    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Летища", href: "/admin/airports" },
    ];

    const airports = await getAirports();

    return (
        <div className="flex">
            <MainSidebar />

            <main className="flex-1">
                <div className="flex items-center gap-5 border-b">
                    <h1 className="text-2xl font-semibold p-5">Летища</h1>
                    <Link href="/admin/airports/new">
                        <Button variant={"default"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>
                </div>

                <Breadcrumbs items={breadcrumbs} />

                <ClientPage data={airports} />
            </main>
        </div>
    );
}