"use client";

import Image from "next/image";
import { useState } from "react";
import { HiOutlineMagnifyingGlassPlus } from "react-icons/hi2";
import { LiaTimesSolid } from "react-icons/lia";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { FaImage, FaPlus } from "react-icons/fa";
import { Landmark } from "@/lib/types";
import { iconLargeSize } from "@/lib/constants";
import SmartImage from "@/components/smart-image";

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
            <section className="bg-white shadow-sm rounded-sm overflow-hidden">
                <div className="flex flex-col md:px-2 gap-1 md:gap-2 max-md:mt-2 px-2">
                    <h2 className="flex items-center gap-2 md:text-2xl font-semibold max-sm:text-xs border-b md:p-5 pb-2">
                        <FaImage className="text-xl md:text-4xl" />
                        <span>Галерия</span>
                    </h2>
                </div>

                <div
                    onClick={() => setLightboxOpen(true)}
                    className="relative cursor-pointer h-30 md:h-100"
                >
                    {!loaded[activeIndex] && (
                        <div className="absolute inset-0 animate-pulse bg-gray-200" />
                    )}

                    <SmartImage
                        src={images[activeIndex]}
                        alt={landmark.name as string}
                        fill
                        className="object-cover"
                        loading="eager"
                        loaderSize="w-10 h-10"
                        onLoadedCallback={() =>
                            setLoaded((prev) => {
                                const copy = [...prev];
                                copy[activeIndex] = true;
                                return copy;
                            })
                        }
                        unoptimized
                    />

                    {loaded[activeIndex] && (
                        <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center">
                            <div className="bg-black/50 p-5 rounded-md">
                                <FaPlus size={30} className="text-white" />
                            </div>
                        </div>
                    )}

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                        <span className="text-white text-2xl opacity-0 group-hover:opacity-100">
                            <HiOutlineMagnifyingGlassPlus
                                size={iconLargeSize}
                            />
                        </span>
                    </div>
                </div>
            </section>

            {/* LIGHTBOX */}
            {lightboxOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
                    onClick={() => setLightboxOpen(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full container mx-auto min-h-150 lg:h-[85vh] bg-black rounded-xl shadow-2xl overflow-hidden flex flex-col"
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
                                alt={landmark.name as string}
                                fill
                                className="object-cover"
                                loading="eager"
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
                        <div className="absolute bottom-0 left-0 flex justify-center w-full py-5 bg-black/70 lg:mt-5">
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

                                        <SmartImage
                                            src={img}
                                            alt={landmark.name as string}
                                            fill
                                            className="object-cover"
                                            loading="eager"
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