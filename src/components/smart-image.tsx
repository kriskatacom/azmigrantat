"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";
import { cn } from "@/lib/utils";

type Props = Omit<ImageProps, "onLoad" | "onError"> & {
    showSkeleton?: boolean;
    loaderSize?: string;
    onLoadedCallback?: Function;
};

export default function SmartImage({
    showSkeleton = true,
    className = "",
    src,
    alt,
    loaderSize = "w-6 h-6",
    onLoadedCallback,
    ...props
}: Props) {
    const [loading, setLoading] = useState(true);
    const hasSrc = Boolean(src);

    return (
        <div className="relative w-full h-full overflow-hidden">
            {/* Skeleton */}
            {showSkeleton && loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <span className={cn(loaderSize, "animate-spin rounded-full border-2 border-t-primary")} />
                </div>
            )}

            {hasSrc && (
                <Image
                    src={src}
                    alt={alt}
                    {...props}
                    className={`transition-opacity duration-500 ${
                        loading ? "opacity-0" : "opacity-100"
                    } ${className}`}
                    onLoad={() => {
                        setLoading(false);
                        onLoadedCallback && onLoadedCallback();
                    }}
                    onError={() => setLoading(false)}
                />
            )}
        </div>
    );
}
