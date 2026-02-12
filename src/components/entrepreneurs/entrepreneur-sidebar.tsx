"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiHome, FiUser, FiSettings } from "react-icons/fi";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { DialogTitle } from "@/components/ui/dialog";
import { BsBuilding } from "react-icons/bs";
import { useSidebar } from "../main-sidebar/sidebar-context";
import { useEffect, useState } from "react";

const links = [
    { name: "Табло", href: "/entrepreneurs", icon: FiHome },
    { name: "Реклами", href: "/entrepreneurs/ads", icon: FiUser },
    { name: "Обяви", href: "/entrepreneurs/offers", icon: FiSettings },
    { name: "Компании", href: "/entrepreneurs/companies", icon: BsBuilding },
];

function SidebarContent() {
    const pathname = usePathname();

    return (
        <div className="flex h-full flex-col">
            <div className="p-5.5 text-xl font-semibold border-b">Табло</div>

            <nav className="flex-1">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;

                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-5 p-5 border-b text-lg font-medium transition-colors",
                                isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-website-light",
                            )}
                        >
                            <Icon size={30} />
                            {link.name}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}

export default function EntrepreneurLeftSidebar() {
    const { collapsed, toggleSidebar } = useSidebar();
    const isDesktop = useMediaQuery("(min-width: 768px)");

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <SidebarSkeleton />
    }

    return (
        <>
            {isDesktop && (
                <aside
                    className={cn(
                        collapsed ? "w-80" : "w-0 overflow-hidden",
                        "border-r bg-background transition-all duration-300",
                    )}
                >
                    <SidebarContent />
                </aside>
            )}

            {!isDesktop && (
                <Sheet open={collapsed} onOpenChange={toggleSidebar}>
                    <SheetContent side="left" className="p-0 w-80">
                        <DialogTitle />
                        <SidebarContent />
                    </SheetContent>
                </Sheet>
            )}
        </>
    );
}

export function SidebarSkeleton() {
    return (
        <aside className="w-80 border-r bg-background p-5 space-y-6 animate-pulse">
            <div className="h-6 w-32 bg-muted rounded" />

            <div className="space-y-4">
                <div className="h-10 bg-muted rounded" />
                <div className="h-10 bg-muted rounded" />
                <div className="h-10 bg-muted rounded" />
                <div className="h-10 bg-muted rounded" />
            </div>
        </aside>
    );
}
