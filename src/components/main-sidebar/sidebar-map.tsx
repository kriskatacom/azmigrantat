"use client";

import { AdminSidebarItem } from "@/lib/types";
import { SidebarItem } from "@/components/main-sidebar/sidebar-item";
import { usePathname } from "next/navigation";
import { urlStartsWith } from "@/lib/utils";

type SidebarMapProps = {
    items: AdminSidebarItem[];
};

export function SidebarMap({ items }: SidebarMapProps) {
    const pathname = usePathname();

    return (
        <ul className="flex flex-col gap-1">
            {items.map((item, index) => (
                <SidebarItem
                    key={index}
                    item={item}
                    active={urlStartsWith(pathname, item.link)}
                />
            ))}
        </ul>
    );
}
