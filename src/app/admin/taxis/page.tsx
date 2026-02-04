import { Metadata } from "next";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { websiteName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import MainSidebarServer from "@/components/main-sidebar/main-sidebar-server";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/admin/taxis/client-page";
import { getTaxis } from "@/lib/services/taxi-service";

export const metadata: Metadata = {
    title: websiteName("Таксиметрови компании"),
};

export default async function AutobusesPage() {
    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Таксиметрови компании", href: "/admin/taxis" },
    ];

    const taxis = await getTaxis();

    return (
        <div className="flex">
            <MainSidebarServer />

            <main className="flex-1">
                <div className="flex items-center gap-5 border-b">
                    <h1 className="text-2xl font-semibold p-5">Таксиметрови компании</h1>
                    <Link href="/admin/taxis/new">
                        <Button variant={"outline"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>
                </div>

                <Breadcrumbs items={breadcrumbs} />

                <ClientPage data={taxis} />
            </main>
        </div>
    );
}