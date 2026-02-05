"use client";

import { useState } from "react";
import Image from "next/image";
import { Country } from "@/lib/types";

type Props = {
    country: Country;
};

export default function ClientPage({ country }: Props) {
    const [imageLoading, setImageLoading] = useState(true);

    return (
        <>
            {country.image_url && country.name && (
                <div className="relative w-full min-h-60 md:min-h-80 lg:min-h-100 xl:min-h-120">
                    <Image
                        src={country.image_url}
                        alt={country.name}
                        fill
                        className={`object-cover transition-opacity duration-500 ${
                            imageLoading ? "opacity-0" : "opacity-100"
                        }`}
                        onLoad={() => setImageLoading(false)}
                        onError={() => setImageLoading(false)}
                    />
                </div>
            )}
        </>
    );
}