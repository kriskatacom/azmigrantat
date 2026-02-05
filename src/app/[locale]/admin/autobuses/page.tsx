import { Metadata } from "next";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { websiteName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import MainSidebarServer from "@/components/main-sidebar/main-sidebar-server";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/[locale]/admin/autobuses/client-page";
import { getAutobuses } from "@/lib/services/autobus-service";

export const metadata: Metadata = {
    title: websiteName("Автобусни гари"),
};

export default async function AutobusesPage() {
    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Автобусни гари", href: "/admin/autobuses" },
    ];

    const autobuses = await getAutobuses();

    return (
        <div className="flex">
            <MainSidebarServer />

            <main className="flex-1">
                <div className="flex items-center gap-5 border-b">
                    <h1 className="text-2xl font-semibold p-5">Автобусни гари</h1>
                    <Link href="/admin/autobuses/new">
                        <Button variant={"outline"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>
                </div>

                <Breadcrumbs items={breadcrumbs} />

                <ClientPage data={autobuses} />
            </main>
        </div>
    );
}