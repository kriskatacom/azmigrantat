"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
import { AdminSidebarItem } from "@/lib/types";

type Props = {
    item: AdminSidebarItem;
    active: boolean;
};

export function SidebarItem({ item, active }: Props) {
    const { collapsed } = useSidebar();
    const Icon = item.icon;

    return (
        <li>
            <Link
                href={`${item.link}`}
                className={cn(
                    "flex items-center gap-3 rounded-md py-3 px-4 hover:text-white hover:bg-primary duration-300",
                    active && "text-white bg-primary",
                )}
            >
                <span className="w-8 flex justify-center shrink-0">
                    {Icon && <Icon className="h-7 w-7" />}
                </span>

                <span
                    className={cn(
                        "text-lg font-medium transition-all whitespace-nowrap duration-300",
                        collapsed
                            ? "opacity-0 -translate-x-4 pointer-events-none w-0"
                            : "opacity-100 translate-x-0",
                    )}
                >
                    {item.name}
                </span>
            </Link>
        </li>
    );
}
