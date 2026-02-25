"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import AppImage from "@/components/AppImage";

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
    return (
        <section
            className="relative w-full flex items-center justify-center text-center overflow-hidden"
            style={{ height: `${height}px` }}
        >
            {title && image_url && (
                <AppImage
                    src={image_url}
                    alt={title}
                    fill
                />
            )}
            <div className="absolute inset-0 bg-black/50" />
            <div className="text-white max-w-4xl mx-auto relative z-10 px-5">
                <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold drop-shadow-lg">
                    {title}
                </h1>
                {excerpt && (
                    <p
                        className="text-light text-xl lg:text-xl drop-shadow-lg py-5"
                        dangerouslySetInnerHTML={{ __html: excerpt }}
                    ></p>
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
