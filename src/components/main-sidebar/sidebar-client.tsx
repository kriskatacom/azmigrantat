"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarMap } from "@/components/main-sidebar/sidebar-map";
import { useSidebar } from "@/components/main-sidebar/sidebar-context";
import { AdminSidebarItem } from "@/lib/types";

type SidebarClientProps = {
    items: AdminSidebarItem[];
};

export function SidebarClient({ items }: SidebarClientProps) {
    const { collapsed } = useSidebar();

    return (
        <div>
            <aside
                className={cn(
                    collapsed ? "w-0" : "w-80 overflow-hidden sticky top-0",
                    "border-r bg-background transition-all duration-300 overflow-auto min-h-screen max-h-screen",
                )}
                style={{ zIndex: 100 }}
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <span
                        className={cn(
                            "text-2xl font-semibold transition-all whitespace-nowrap overflow-hidden",
                            collapsed ? "opacity-0 w-0" : "opacity-100",
                        )}
                    >
                        Табло
                    </span>
                </div>

                <ScrollArea className="flex-1 overflow-auto p-2">
                    <SidebarMap items={items} />
                </ScrollArea>
            </aside>
        </div>
    );
}