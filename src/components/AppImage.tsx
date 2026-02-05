"use client";

import Image, { ImageProps } from "next/image";
import { useState, useEffect } from "react";

type AppImageProps = {
    src?: string;
    alt: string;
    fill?: boolean;
    className?: string;
} & Omit<ImageProps, "src" | "alt">;

const FALLBACK_SRC = "/images/fallback.png";

export default function AppImage({
    src,
    alt,
    fill = false,
    className = "",
    ...props
}: AppImageProps) {
    const [currentSrc, setCurrentSrc] = useState(src || FALLBACK_SRC);
    const [imageLoading, setImageLoading] = useState(true);

    useEffect(() => {
        setCurrentSrc(src || FALLBACK_SRC);
        setImageLoading(true);
    }, [src]);

    return (
        <div className={`relative ${fill ? "w-full h-full" : ""}`}>
            {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-t-blue-500" />
                </div>
            )}

            <Image
                src={currentSrc}
                alt={alt}
                fill={fill}
                className={`object-contain transition-opacity duration-500 ${
                    imageLoading ? "opacity-0" : "opacity-100"
                } ${className}`}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                    if (currentSrc !== FALLBACK_SRC) {
                        setCurrentSrc(FALLBACK_SRC);
                        setImageLoading(true);
                    }
                }}
                unoptimized
                {...props}
            />
        </div>
    );
}