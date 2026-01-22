"use client";

import Image from "next/image";
import { useState } from "react";
import { Landmark } from "@/lib/types";

type Props = {
    additionalImages: string[];
    landmark: Landmark;
};

export default function DisplayGallery({ additionalImages, landmark }: Props) {
    return (
        <div className="bg-white border rounded-md h-fit overflow-hidden">
            <h2 className="text-white bg-website-dark text-2xl font-semibold p-5">
                Галерия
            </h2>

            {additionalImages.length > 0 && (
                <div className="grid sm:grid-cols-2">
                    {additionalImages.map((image, index) => {
                        const [imageLoading, setImageLoading] = useState(true);

                        if (!image) {
                            return (
                                <div className="w-24 h-16 flex items-center justify-center text-sm rounded">
                                    N/A
                                </div>
                            );
                        }

                        return (
                            <div
                                key={index}
                                className="relative w-full min-h-80 sm:min-h-60 overflow-hidden border"
                            >
                                {imageLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center z-10">
                                        <span className="h-6 w-6 animate-spin rounded-full border-2 border-t-blue-500" />
                                    </div>
                                )}

                                <Image
                                    src={image}
                                    alt={landmark.heading as string}
                                    fill
                                    className={`w-full h-full object-cover transition-opacity duration-500 ${
                                        imageLoading
                                            ? "opacity-0"
                                            : "opacity-100"
                                    }`}
                                    onLoad={() => setImageLoading(false)}
                                    onError={() => setImageLoading(false)}
                                    unoptimized
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
