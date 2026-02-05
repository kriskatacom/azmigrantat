"use client";

import Image from "next/image";
import { Embassy } from "@/lib/types";
import SmartImage from "@/components/smart-image";
import SmartText from "@/components/smart-text";

type Props = {
    embassy: Embassy;
};

export default function Hero({ embassy }: Props) {
    return (
        <>
            {/* HERO IMAGE */}
            <div className="relative w-full h-60 lg:h-80 xl:h-120 overflow-hidden">
                <SmartImage
                    src={embassy.image_url as string}
                    alt={embassy.heading as string}
                    fill
                    className="object-cover"
                    loading="eager"
                    loaderSize="w-10 h-10"
                    unoptimized
                />
            </div>

            {/* TITLE */}
            <div className="bg-white text-website-dark text-center p-5 md:py-10 border-b">
                <div className="flex justify-center items-center gap-2">
                    <Image
                        src={embassy.logo as string}
                        alt={embassy.name as string}
                        className="object-cover"
                        loading="eager"
                        width={120}
                        height={120}
                        unoptimized
                    />
                    <SmartText
                        value={embassy.heading}
                        as="h1"
                        className="text-xl sm:text-2xl md:text-4xl font-semibold text-center"
                        skeletonClassName="h-8 md:h-10 w-3/4 md:w-1/2"
                    />
                    <Image
                        src={embassy.right_heading_image as string}
                        alt={embassy.name as string}
                        className="object-cover"
                        loading="eager"
                        width={120}
                        height={120}
                        unoptimized
                    />
                </div>
            </div>
        </>
    );
}
