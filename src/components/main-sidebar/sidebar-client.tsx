"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarToggle } from "./sidebar-toggle";
import { SidebarMap } from "./sidebar-map";
import { useSidebar } from "./sidebar-context";
import { mainSidebarItems } from "@/lib/constants";

export function SidebarClient() {
    const items = mainSidebarItems;
    const { collapsed } = useSidebar();

    return (
        <>
            <aside
                className={cn(
                    "fixed top-0 left-0 h-screen border-r bg-background transition-all",
                    collapsed ? "w-20" : "w-72",
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

                    <SidebarToggle />
                </div>

                <ScrollArea className="flex-1 overflow-auto p-2">
                    <SidebarMap items={items} />
                </ScrollArea>
            </aside>
            <div className={cn("min-h-screen duration-300", collapsed ? "w-20" : "w-72")}></div>
        </>
    );
}
