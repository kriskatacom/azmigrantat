import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { UserService } from "@/lib/services/user-service";
import { cookies } from "next/headers";
import { SidebarProvider } from "@/components/main-sidebar/sidebar-context";
import { SidebarData } from "@/components/entrepreneurs/sidebar-data";

const userService = new UserService();

type EntrepreneurLayoutProps = {
    children: ReactNode;
};

export default async function EntrepreneurLayout({
    children,
}: EntrepreneurLayoutProps) {
    const cookieStore = await cookies();
    const collapsedCookie = cookieStore.get("sidebar-collapsed");
    const collapsed = collapsedCookie?.value === "true";

    const user = await userService.getCurrentUser();

    if (!user) return redirect("/");

    return (
        <div className="flex min-h-screen">
            <SidebarProvider initialCollapsed={collapsed}>
                <SidebarData />
                {children}
            </SidebarProvider>
        </div>
    );
}
