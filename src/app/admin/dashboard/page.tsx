import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import { MainSidebar } from "@/components/main-sidebar";

export const metadata: Metadata = {
    title: websiteName("Табло"),
}

export default function Dashboard() {
    return (
        <div className="flex">
            <MainSidebar />
            <main className="flex-1">
                <h1 className="text-2xl font-semibold p-5 border-b">Табло</h1>
            </main>
        </div>
    )
}
