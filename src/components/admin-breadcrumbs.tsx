"use client";

import { cn, isAdminPanel } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";

export type BreadcrumbItem = {
    name: string;
    href?: string;
};

type BreadcrumbsProps = {
    items: BreadcrumbItem[];
    classes?: string;
};

export function Breadcrumbs({ items, classes }: BreadcrumbsProps) {
    const pathname = usePathname();
    if (!items || items.length === 0) return null;

    return (
        <nav
            className={cn(
                `${isAdminPanel(pathname) ? "text-blue-500" : "text-website-light"} pt-5 px-5 flex items-center flex-wrap space-x-1`,
                classes,
            )}
            aria-label="breadcrumbs"
        >
            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <span key={index} className="flex items-center">
                        {item.href && !isLast ? (
                            <Link href={item.href} className="hover:underline">
                                {item.name}
                            </Link>
                        ) : (
                            <span
                                className={
                                    isLast
                                        ? `${isAdminPanel(pathname) ? "text-black" : "text-white"} font-medium`
                                        : ""
                                }
                            >
                                {item.name}
                            </span>
                        )}

                        {!isLast && <span className="mx-1">/</span>}
                    </span>
                );
            })}
        </nav>
    );
}
