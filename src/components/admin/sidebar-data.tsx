"use client";

import { mainSidebarItems } from "@/lib/constants";
import { SidebarClient } from "@/components/main-sidebar/sidebar-client";

export function SidebarData() {
    return <SidebarClient items={mainSidebarItems} />;
}
