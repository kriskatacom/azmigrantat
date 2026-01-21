"use client";

import Link from "next/link";

export type BreadcrumbItem = {
    name: string;
    href?: string;
};

type BreadcrumbsProps = {
    items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
    if (!items || items.length === 0) return null;

    return (
        <nav className="mt-5 px-5 flex items-center space-x-1" aria-label="breadcrumbs">
            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <span key={index} className="flex items-center">
                        {item.href && !isLast ? (
                            <Link href={item.href} className="hover:underline text-blue-600">
                                {item.name}
                            </Link>
                        ) : (
                            <span className={isLast ? "font-medium" : ""}>
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