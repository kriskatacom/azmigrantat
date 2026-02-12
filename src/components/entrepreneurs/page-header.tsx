"use client";

import { FiMenu } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { useSidebar } from "../main-sidebar/sidebar-context";

type PageHeaderProps = {
    title: string;
}

export default function PageHeader({ title }: PageHeaderProps) {
    const { toggleSidebar } = useSidebar();

    return (
        <div className="flex items-center bg-white w-full px-5 border-b">
            <Button variant="outline" size="icon-lg" onClick={toggleSidebar}>
                <FiMenu />
            </Button>
            <h1 className="text-2xl font-semibold p-5 border-b">
                {title}
            </h1>
        </div>
    );
}