"use client";

import { useState } from "react";
import Image from "next/image";
import { Landmark } from "@/lib/types";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";

type Props = {
    landmark: Landmark;
    breadcrumbs: BreadcrumbItem[];
};

export default function Hero({ landmark, breadcrumbs }: Props) {
    const [imageLoading, setImageLoading] = useState(true);

    return (
        <>
            <div className="relative w-full h-60 lg:h-80 xl:h-120 flex justify-center">
                <Image
                    src={landmark.image_url as string}
                    alt={landmark.name as string}
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
                <h1 className="text-2xl md:text-4xl text-center font-semibold">
                    {landmark.heading ? landmark.heading : landmark.name}
                </h1>
            </div>
        </>
    );
}
