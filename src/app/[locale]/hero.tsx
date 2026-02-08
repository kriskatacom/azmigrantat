import React from "react";
import { Button } from "@/components/ui/button";

type HeroProps = {
    title: string;
    subtitle?: string;
    image_url: string;
    ctaText?: string;
    ctaLink?: string;
};

export const Hero: React.FC<HeroProps> = ({
    title,
    subtitle,
    image_url,
    ctaText,
    ctaLink,
}) => {
    return (
        <section className="relative w-full h-200 flex items-center justify-center text-center overflow-hidden">
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 transform scale-100 hover:scale-105"
                style={{
                    backgroundImage: `url(${image_url || "/images/default.webp"})`,
                }}
            />

            <div className="absolute inset-0 bg-black/40" />

            <div className="mt-130 max-w-4xl mx-auto relative z-10 px-5">
                <h1 className="text-white text-3xl lg:text-4xl font-bold drop-shadow-lg">
                    {title}
                </h1>

                {subtitle && (
                    <p className="text-secondary text-3xl lg:text-4xl font-bold drop-shadow-lg mt-2">
                        {subtitle}
                    </p>
                )}
            </div>
        </section>
    );
};
