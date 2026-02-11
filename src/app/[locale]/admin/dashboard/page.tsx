import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { websiteName } from "@/lib/utils";
import MainSidebarServer from "@/components/main-sidebar/main-sidebar-server";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
    title: websiteName("Табло"),
}

export default async function Dashboard() {
    
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return redirect("/users/login");
    }

    return (
        <div className="flex">
            <MainSidebarServer />
            <main className="flex-1">
                <h1 className="text-2xl font-semibold p-5 border-b">Табло</h1>
                {session.user.name}
            </main>
        </div>
    )
}
