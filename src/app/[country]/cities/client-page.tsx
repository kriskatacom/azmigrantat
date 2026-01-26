"use client";

import { useState } from "react";
import Image from "next/image";
import { Country } from "@prisma/client";

type Props = {
    country: Country;
};

export default function ClientPage({ country }: Props) {
    const [imageLoading, setImageLoading] = useState(true);

    return (
        <>
            {country.imageUrl && (
                <div className="relative w-full min-h-60 md:min-h-80 lg:min-h-100 xl:min-h-120">
                    <Image
                        src={country.imageUrl}
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