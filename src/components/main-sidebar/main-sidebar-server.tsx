import { cookies } from "next/headers";
import { SidebarProvider } from "@/components/main-sidebar/sidebar-context";
import { SidebarClient } from "@/components/main-sidebar/sidebar-client";

export default async function MainSidebarServer() {
    const cookieStore = await cookies();
    const collapsedCookie = cookieStore.get("sidebar-collapsed");
    const collapsed = collapsedCookie?.value === "true";

    return (
        <SidebarProvider initialCollapsed={collapsed}>
            <SidebarClient />
        </SidebarProvider>
    );
}
