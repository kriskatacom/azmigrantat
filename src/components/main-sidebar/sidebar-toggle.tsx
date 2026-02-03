"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSidebar } from "./sidebar-context";

export function SidebarToggle() {
    const { collapsed, toggleSidebar, isPending } = useSidebar();

    return (
        <button
            onClick={toggleSidebar}
            disabled={isPending}
            className="p-2 rounded-md hover:bg-accent transition-colors disabled:opacity-50"
        >
            {collapsed ? (
                <ChevronRight className="h-5 w-5" />
            ) : (
                <ChevronLeft className="h-5 w-5" />
            )}
        </button>
    );
}