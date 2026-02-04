"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type AlertVariant = "info" | "success" | "warning" | "error";

type AlertProps = {
    title?: string;
    children: ReactNode;
    variant?: AlertVariant;
    className?: string;
};

const variantStyles: Record<AlertVariant, string> = {
    info: "bg-blue-50 text-blue-700 border-blue-200",
    success: "bg-green-50 text-green-700 border-green-200",
    warning: "bg-yellow-50 text-yellow-800 border-yellow-200",
    error: "bg-red-50 text-red-700 border-red-200",
};

export function Alert({
    title,
    children,
    variant = "info",
    className,
}: AlertProps) {
    return (
        <div
            className={cn(
                "px-5 py-3 border rounded-md text-sm",
                variantStyles[variant],
                className,
            )}
            role="alert"
        >
            {title && <strong className="mr-1">{title}</strong>}
            <span>{children}</span>
        </div>
    );
}
