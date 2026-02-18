"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import AppImage from "@/components/AppImage";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export type Slide = {
    id: number;
    image: string;
    title: string;
    description: string;
    url: string;
};

type ImageSliderProps = {
    title: string;
    slides: Slide[];
    cityName: string;
    countryName: string;
};

export default function ImageSlider({
    title,
    slides,
    cityName,
    countryName,
}: ImageSliderProps) {
    const router = useRouter();

    const navigate = (to: string) => {
        router.push(`?by=${to}`);
        router.refresh();
    };

    const breakpoints = useMemo(
        () => ({
            0: { slidesPerView: 1 },
            640: { slidesPerView: slides.length === 1 ? 1 : 2 },
            1024: { slidesPerView: slides.length === 1 ? 1 : 2 },
        }),
        [slides.length],
    );

    return (
        <div className="w-full overflow-hidden">
            <h2 className="text-2xl font-semibold text-center">{title}</h2>
            <Swiper
                key={slides.map((s) => s.id).join("-")}
                modules={[Autoplay]}
                slidesPerView={3}
                spaceBetween={20}
                loop={true}
                speed={8000}
                autoplay={{
                    delay: 1, // ⚠️ НЕ 0
                    pauseOnMouseEnter: true,
                }}
                breakpoints={breakpoints}
                className="continuous-swiper"
            >
                {slides.map((slide, index) => (
                    <SwiperSlide key={index}>
                        <Link
                            href={slide.url}
                            className="block relative h-50 group"
                        >
                            <div className="relative h-50 overflow-hidden rounded-xl">
                                <AppImage
                                    fill
                                    src={slide.image}
                                    alt={slide.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />

                                <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-white text-center p-4">
                                    <h2 className="text-2xl font-bold mb-2">
                                        {slide.title}
                                    </h2>
                                    <p>{slide.description}</p>
                                </div>
                            </div>
                        </Link>
                    </SwiperSlide>
                ))}
            </Swiper>

            <div className="flex justify-center text-center gap-2 mt-2">
                <Button
                    variant={"link"}
                    size={"lg"}
                    className="text-white bg-website-dark"
                    onClick={() => navigate("city")}
                >
                    Обяви от {cityName}
                </Button>
                <Button
                    variant={"link"}
                    className="text-white bg-website-dark"
                    size={"lg"}
                    onClick={() => navigate("country")}
                >
                    Обяви от {countryName}
                </Button>
            </div>

            <style jsx global>{`
                .continuous-swiper .swiper-wrapper {
                    transition-timing-function: linear !important;
                }
            `}</style>
        </div>
    );
}
