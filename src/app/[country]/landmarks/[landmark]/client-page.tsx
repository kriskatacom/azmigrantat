"use client";

import { useState } from "react";
import Image from "next/image";
import { Landmark } from "@/lib/types";

type Props = {
    landmark: Landmark;
};

export default function ClientPage({ landmark }: Props) {
    const [imageLoading, setImageLoading] = useState(true);

    return (
        <div className="relative w-full h-60 lg:h-80 xl:h-120 flex justify-center">
            <div className="absolute top-0 left-0 w-full h-full bg-black/20 z-10"></div>
            <h1 className="absolute top-10 z-10 text-3xl xl:text-4xl 2xl:text-5xl text-white text-center font-bold text-shadow-2xs">
                {landmark.heading ? landmark.heading : landmark.name}
            </h1>

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
    );
}