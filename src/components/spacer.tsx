"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SpacerProps {
    size?: number | string;
    direction?: "vertical" | "horizontal";
    className?: string;
}

const Spacer: React.FC<SpacerProps> = ({
    size = 4,
    direction = "vertical",
    className,
}) => {
    const style =
        typeof size === "number"
            ? direction === "vertical"
                ? { height: `${size}px` }
                : { width: `${size}px` }
            : undefined;

    const classes = cn(
        direction === "vertical" ? "block w-full" : "inline-block h-full",
        className,
    );

    return <div className={classes} style={style} />;
};

export default Spacer;