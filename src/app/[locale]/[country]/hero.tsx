"use client";

import Image from "next/image";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";

type HeroProps = {
    title?: string;
    excerpt?: string;
    image_url?: string;
    ctaText?: string;
    ctaLink?: string;
    height?: number;
};

export const Hero: React.FC<HeroProps> = ({
    title,
    excerpt,
    image_url,
    ctaText,
    ctaLink,
    height = 600,
}) => {
    const [imageLoading, setImageLoading] = useState(true);

    return (
        <section
            className="relative w-full flex items-center justify-center text-center overflow-hidden"
            style={{ height: `${height}px` }}
        >
            {title && image_url && (
                <Image
                    src={image_url}
                    alt={title}
                    fill
                    className={`object-cover transition-opacity duration-500 ${
                        imageLoading ? "opacity-0" : "opacity-100"
                    }`}
                    onLoad={() => setImageLoading(false)}
                    onError={() => setImageLoading(false)}
                />
            )}
            <div className="absolute inset-0 bg-black/50" />
            <div className="text-white max-w-4xl mx-auto relative z-10 px-5">
                <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold drop-shadow-lg">
                    {title}
                </h1>
                {excerpt && (
                    <p className="text-light text-xl lg:text-xl drop-shadow-lg py-5">
                        {excerpt}
                    </p>
                )}
                {ctaText && ctaLink && (
                    <div className="mt-5">
                        <a href={ctaLink} className="text-website-dark">
                            <Button variant={"outline"} size={"xl"}>
                                {ctaText}
                            </Button>
                        </a>
                    </div>
                )}
            </div>
        </section>
    );
};
