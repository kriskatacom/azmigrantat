"use client";

import { Landmark } from "@/lib/types";
import SmartImage from "@/components/smart-image";
import SmartText from "@/components/smart-text";

type Props = {
    landmark: Landmark;
};

export default function Hero({ landmark }: Props) {
    return (
        <>
            {/* HERO IMAGE */}
            <div className="relative w-full h-60 lg:h-80 xl:h-120 overflow-hidden">
                <SmartImage
                    src={landmark.image_url as string}
                    alt={landmark.name as string}
                    fill
                    className="object-cover"
                    loading="eager"
                    loaderSize="w-10 h-10"
                    unoptimized
                />
            </div>

            {/* TITLE */}
            <div className="bg-white text-website-dark text-center p-5 md:py-10 border-b">
                <SmartText
                    value={landmark.heading}
                    as="h1"
                    className="text-2xl md:text-4xl font-semibold text-center"
                    skeletonClassName="h-8 md:h-10 w-3/4 md:w-1/2"
                />
            </div>
        </>
    );
}
