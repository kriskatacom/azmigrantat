"use client";

import { entrepreneurSidebarItems } from "@/lib/constants";
import { SidebarClient } from "@/components/main-sidebar/sidebar-client";

export function SidebarData() {
    return <SidebarClient items={entrepreneurSidebarItems} />;
}
