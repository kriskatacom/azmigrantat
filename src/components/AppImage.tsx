"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";

type AppImageProps = {
    src: string;
    alt: string;
    fill?: boolean;
    className?: string;
} & Omit<ImageProps, "src" | "alt">;

export default function AppImage({
    src,
    alt,
    fill = false,
    className = "",
    ...props
}: AppImageProps) {
    const [imageLoading, setImageLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const fallbackSrc = "/images/fallback.png";

    return (
        <div className={fill ? "w-full h-full" : ""}>
            {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-t-blue-500" />
                </div>
            )}
            <Image
                src={hasError ? fallbackSrc : src}
                alt={alt}
                fill={fill}
                className={`object-contain transition-opacity duration-500 ${
                    imageLoading ? "opacity-0" : "opacity-100"
                } ${className}`}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                    setHasError(true);
                    setImageLoading(false);
                }}
                unoptimized
                {...props}
            />
        </div>
    );
}
