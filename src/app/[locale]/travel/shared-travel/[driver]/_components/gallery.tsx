"use client";

import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import { Driver } from "@/lib/services/driver-service";
import AppImage from "@/components/AppImage";

type GalleryProps = {
    driver: Driver;
    images: string[];
};

export default function Gallery({ driver, images }: GalleryProps) {
    const [open, setOpen] = useState(false);
    const [index, setIndex] = useState(0);
    const slides = images.map((img) => ({
        src: img,
        alt: driver.name as string,
    }));

    return (
        <>
            <div className="overflow-hidden rounded-md border shadow-sm">
                <h2 className="text-white bg-website-dark text-xl lg:text-2xl font-semibold p-3 md:p-5">
                    Галерия
                </h2>
                {driver.background_image_url && (
                    <div className="relative w-full h-full">
                        <AppImage
                            src={driver.background_image_url}
                            alt=""
                            fill
                            className="object-cover"
                            onClick={() => setOpen(!open)}
                        />
                    </div>
                )}
            </div>
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
