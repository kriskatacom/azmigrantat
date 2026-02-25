"use client";

import { useState } from "react";
import { HiOutlineMagnifyingGlassPlus } from "react-icons/hi2";
import { FaImage } from "react-icons/fa";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import { Landmark } from "@/lib/types";
import { iconLargeSize } from "@/lib/constants";
import SmartImage from "@/components/smart-image";

type Props = {
    additionalImages: string[];
    landmark: Landmark;
};

export default function DisplayGallery({ additionalImages, landmark }: Props) {
    const slides = additionalImages.map((img) => ({
        src: img,
        alt: landmark.name as string,
    }));

    const [open, setOpen] = useState(false);
    const [index, setIndex] = useState(0);

    if (slides.length === 0) return null;

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
                    className="relative cursor-pointer h-30 md:h-100"
                    onClick={() => setOpen(!open)}
                >
                    <SmartImage
                        src={slides[0].src}
                        alt={landmark.name as string}
                        fill
                        className="object-cover"
                    />

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                        <span className="text-white text-2xl opacity-0 group-hover:opacity-100">
                            <HiOutlineMagnifyingGlassPlus
                                size={iconLargeSize}
                            />
                        </span>
                    </div>
                </div>
            </section>

            <Lightbox
                open={open}
                close={() => setOpen(false)}
                index={index}
                slides={slides}
                plugins={[Fullscreen, Zoom, Thumbnails]}
                toolbar={{ buttons: ["close"] }}
                carousel={{ imageFit: "contain", spacing: "10%" }}
                thumbnails={{
                    borderColor: "#202020",
                    width: 150,
                    height: 100,
                    border: 5,
                    borderRadius: 10,
                    padding: 0,
                    gap: 10,
                    imageFit: "cover",
                    showToggle: true,
                }}
            />
        </>
    );
}
