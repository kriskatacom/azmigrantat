"use client";

import { ReactNode } from "react";

type Props = {
    value?: string | null;
    as?: "h1" | "h2" | "h3" | "p" | "span";
    className?: string;
    skeletonClassName?: string;
};

export default function SmartText({
    value,
    as = "p",
    className = "",
    skeletonClassName = "h-6 w-1/2",
}: Props) {
    if (!value?.trim()) {
        return (
            <div
                className={`mx-auto bg-gray-600 rounded animate-pulse ${skeletonClassName}`}
            />
        );
    }

    const Component = as;

    return <Component className={className}>{value}</Component>;
}
