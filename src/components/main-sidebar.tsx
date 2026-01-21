"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { iconMediumSize, mainSidebarItems } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { AdminSidebarItem } from "@/lib/types";

export const MainSidebar = () => {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();

    return (
        <aside
            className={`min-h-screen bg-slate-100 border-r dark:bg-gray-900 dark:border-gray-800
                  transition-all duration-300 ${collapsed ? "w-20" : "w-72"}`}
        >
            <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
                {!collapsed && (
                    <span className="text-2xl font-semibold">Табло</span>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                    {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
                </button>
            </div>

            <ul className="flex flex-col gap-1 p-2">
                {mainSidebarItems.map((item, index) => (
                    <SidebarItem
                        key={index}
                        item={item}
                        collapsed={collapsed}
                        active={pathname?.includes(item.link || "")}
                    />
                ))}
            </ul>
        </aside>
    );
};

type Props = {
    item: AdminSidebarItem;
    collapsed: boolean;
    active: boolean;
};

export const SidebarItem = ({ item, collapsed, active }: Props) => {
    const Icon = item.icon;

    return (
        <li>
            <Link href={`/admin/${item.link}`} className={cn(active && "bg-popover", "flex items-center justify-start gap-2 py-3 px-5 rounded-md hover:bg-popover")}>
                <span className="w-12 flex justify-center">
                    {Icon && (
                        <Icon size={iconMediumSize} className="duration-300" />
                    )}
                </span>
                <span
                    className={`text-lg transition-all duration-300 ${
                        collapsed
                            ? "opacity-0 -translate-x-4 pointer-events-none"
                            : "opacity-100 translate-x-0"
                    }`}
                >
                    {item.name}
                </span>
            </Link>
        </li>
    );
};
