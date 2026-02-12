import { ReactNode } from "react";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/app/providers/theme-provider";
import { SidebarProvider } from "@/components/main-sidebar/sidebar-context";
import { SidebarData } from "@/components/admin/sidebar-data";

type AdminLayoutProps = {
    children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
    const cookieStore = await cookies();
    const collapsedCookie = cookieStore.get("sidebar-collapsed");
    const collapsed = collapsedCookie?.value === "true";

    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <div className="flex min-h-screen">
                <SidebarProvider initialCollapsed={collapsed}>
                    <SidebarData />
                    {children}
                </SidebarProvider>
            </div>
        </ThemeProvider>
    );
}
