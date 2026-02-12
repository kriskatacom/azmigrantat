"use client";

import { FiMenu } from "react-icons/fi";
import { useSidebar } from "./sidebar-context";
import { Button } from "../ui/button";

export function SidebarToggle() {
    const { collapsed, toggleSidebar, isPending } = useSidebar();

    return (
        <Button
            variant="outline"
            size="icon-lg"
            onClick={toggleSidebar}
            disabled={isPending}
        >
            <FiMenu />
        </Button>
    );
}