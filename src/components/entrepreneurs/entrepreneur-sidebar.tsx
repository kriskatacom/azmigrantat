"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiHome, FiUser, FiSettings } from "react-icons/fi";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useEntrepreneurSidebarStore } from "@/stores/entrepreneur-sidebar-store";
import { DialogTitle } from "@/components/ui/dialog";
import { BsBuilding } from "react-icons/bs";

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
    const { isOpen, setOpen } = useEntrepreneurSidebarStore();
    const isDesktop = useMediaQuery("(min-width: 768px)");

    if (isDesktop) {
        return (
            <aside
                className={cn(
                    isOpen ? "w-80" : "w-0 overflow-hidden",
                    "border-r bg-background duration-300",
                )}
            >
                <SidebarContent />
            </aside>
        );
    }

    return (
        <Sheet open={isOpen} onOpenChange={setOpen}>
            <SheetContent side="left" className="p-0 w-80">
                <DialogTitle />
                <SidebarContent />
            </SheetContent>
        </Sheet>
    );
}
