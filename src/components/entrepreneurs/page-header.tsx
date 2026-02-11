"use client";

import { FiMenu } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { useEntrepreneurSidebarStore } from "@/stores/entrepreneur-sidebar-store";

export default function PageHeader() {
    const { toggle } = useEntrepreneurSidebarStore((state) => state);

    return (
        <div className="flex items-center bg-white w-full px-5 border-b">
            <Button variant="outline" size="icon-lg" onClick={toggle}>
                <FiMenu />
            </Button>
            <h1 className="text-2xl font-semibold p-5 border-b">
                Табло за предприемачи
            </h1>
        </div>
    );
}