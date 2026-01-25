"use client";

import { useState } from "react";
import Image from "next/image";
import { Embassy } from "@/lib/types";

type Props = {
    embassy: Embassy;
};

export default function ClientPage({ embassy }: Props) {
    const [imageLoading, setImageLoading] = useState(true);

    return (
        <div className="bg-white">
            <div className="container mx-auto lg:px-5">
                <div className="relative w-full h-60 lg:h-80 xl:h-100">
                    <Image
                        src={embassy.image_url as string}
                        alt={embassy.name as string}
                        fill
                        className={`w-full h-full object-cover transition-opacity duration-500 ${
                            imageLoading ? "opacity-0" : "opacity-100"
                        }`}
                        onLoad={() => setImageLoading(false)}
                        onError={() => setImageLoading(false)}
                        unoptimized
                    />
                </div>
            </div>
        </div>
    );
}
