import { cookies } from "next/headers";
import { SidebarProvider } from "./sidebar-context";
import { SidebarClient } from "./sidebar-client";

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
