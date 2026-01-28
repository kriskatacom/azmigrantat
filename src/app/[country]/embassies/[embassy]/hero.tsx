"use client";

import { useState } from "react";
import Image from "next/image";
import { Embassy } from "@/lib/types";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";

type Props = {
    embassy: Embassy;
    breadcrumbs: BreadcrumbItem[];
};

export default function Hero({ embassy, breadcrumbs }: Props) {
    const [imageLoading, setImageLoading] = useState(true);
    const [logoLoading, setLogoLoading] = useState(true);

    return (
        <>
            <div className="relative w-full h-60 lg:h-80 xl:h-120 flex justify-center">
                <Image
                    src={embassy.image_url as string}
                    alt={embassy.heading as string}
                    fill
                    className={`w-full h-full object-cover transition-opacity duration-500 ${
                        imageLoading ? "opacity-0" : "opacity-100"
                    }`}
                    onLoad={() => setImageLoading(false)}
                    onError={() => setImageLoading(false)}
                    unoptimized
                />
            </div>
            <div className="bg-white text-website-dark text-center p-5 md:py-10 border-b">
                <div className="flex justify-center items-center gap-2">
                    <Image
                        src={embassy.logo as string}
                        alt={embassy.name as string}
                        width={80}
                        height={80}
                        className={`object-cover transition-opacity duration-500 ${
                            logoLoading ? "opacity-0" : "opacity-100"
                        }`}
                        onLoad={() => setLogoLoading(false)}
                        onError={() => setLogoLoading(false)}
                        unoptimized
                    />
                    <h1 className="text-2xl md:text-4xl text-center font-semibold">
                        {embassy.heading ? embassy.heading : embassy.name}
                    </h1>
                </div>
            </div>
        </>
    );
}
