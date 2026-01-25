"use client";

import Image from "next/image";
import { useState } from "react";
import { Landmark } from "@/lib/types";
import { HiOutlineMagnifyingGlassPlus } from "react-icons/hi2";
import { LiaTimesSolid } from "react-icons/lia";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { iconLargeSize } from "@/lib/constants";

type Props = {
    additionalImages: string[];
    landmark: Landmark;
};

export default function DisplayGallery({ additionalImages, landmark }: Props) {
    const images = additionalImages.filter(Boolean);

    const [loaded, setLoaded] = useState<boolean[]>(
        Array(images.length).fill(false),
    );

    const [activeIndex, setActiveIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    if (images.length === 0) return null;

    return (
        <>
            <div className="bg-white border rounded-md overflow-hidden h-fit">
                <h2 className="text-white bg-website-dark text-2xl font-semibold text-center p-5">
                    Галерия
                </h2>

                <div className="p-4 space-y-4">
                    {/* MAIN IMAGE */}
                    <div
                        onClick={() => setLightboxOpen(true)}
                        className="relative cursor-pointer rounded-xl overflow-hidden shadow-md group min-h-80"
                    >
                        {!loaded[activeIndex] && (
                            <div className="absolute inset-0 animate-pulse bg-gray-200" />
                        )}

                        <Image
                            src={images[activeIndex]}
                            alt={landmark.heading as string}
                            fill
                            className={`object-cover transition duration-500 ${
                                loaded[activeIndex]
                                    ? "opacity-100"
                                    : "opacity-0"
                            }`}
                            onLoad={() =>
                                setLoaded((prev) => {
                                    const copy = [...prev];
                                    copy[activeIndex] = true;
                                    return copy;
                                })
                            }
                            unoptimized
                        />

                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                            <span className="text-white text-2xl opacity-0 group-hover:opacity-100">
                                <HiOutlineMagnifyingGlassPlus
                                    size={iconLargeSize}
                                />
                            </span>
                        </div>
                    </div>

                    {/* THUMBNAILS */}
                    <div className="flex gap-3 overflow-x-auto pb-1">
                        {images.slice(0, 5).map((img, index) => (
                            <button
                                key={index}
                                onClick={() => setActiveIndex(index)}
                                className={`relative h-20 w-28 shrink-0 rounded-md overflow-hidden border transition ${
                                    index === activeIndex
                                        ? "ring-2 ring-website-dark"
                                        : "opacity-70 hover:opacity-100"
                                }`}
                            >
                                {!loaded[index] && (
                                    <div className="absolute inset-0 animate-pulse bg-gray-200" />
                                )}

                                <Image
                                    src={img}
                                    alt=""
                                    fill
                                    className="object-cover"
                                    onLoad={() =>
                                        setLoaded((prev) => {
                                            const copy = [...prev];
                                            copy[index] = true;
                                            return copy;
                                        })
                                    }
                                    unoptimized
                                />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* LIGHTBOX */}
            {lightboxOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
                    onClick={() => setLightboxOpen(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full lg:p-5 container mx-auto min-h-150 lg:h-[85vh] bg-black rounded-xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* TOP BAR */}
                        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-linear-to-b from-black/70 to-transparent">
                            <span className="text-white text-sm opacity-70">
                                {activeIndex + 1} / {images.length}
                            </span>

                            <button
                                onClick={() => setLightboxOpen(false)}
                                className="text-white text-2xl hover:opacity-70 transition"
                            >
                                <LiaTimesSolid />
                            </button>
                        </div>

                        {/* IMAGE AREA */}
                        <div className="relative flex-1">
                            <Image
                                src={images[activeIndex]}
                                alt="Lightbox"
                                fill
                                className="object-contain"
                                unoptimized
                            />

                            {/* NAV BUTTONS */}
                            <button
                                onClick={() =>
                                    setActiveIndex(
                                        (activeIndex - 1 + images.length) %
                                            images.length,
                                    )
                                }
                                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
                            >
                                <FaChevronLeft />
                            </button>

                            <button
                                onClick={() =>
                                    setActiveIndex(
                                        (activeIndex + 1) % images.length,
                                    )
                                }
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
                            >
                                <FaChevronRight />
                            </button>
                        </div>

                        {/* THUMBNAILS */}
                        <div className="bg-black/70 lg:mt-5">
                            <div className="flex justify-center gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-white/20">
                                {images.map((img, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setActiveIndex(index)}
                                        className={`relative h-16 w-24 shrink-0 rounded-md overflow-hidden border transition ${
                                            index === activeIndex
                                                ? "ring-2 ring-white"
                                                : "opacity-60 hover:opacity-100"
                                        }`}
                                    >
                                        {!loaded[index] && (
                                            <div className="absolute inset-0 animate-pulse bg-gray-700" />
                                        )}

                                        <Image
                                            src={img}
                                            alt=""
                                            fill
                                            className="object-cover"
                                            onLoad={() =>
                                                setLoaded((prev) => {
                                                    const copy = [...prev];
                                                    copy[index] = true;
                                                    return copy;
                                                })
                                            }
                                            unoptimized
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
