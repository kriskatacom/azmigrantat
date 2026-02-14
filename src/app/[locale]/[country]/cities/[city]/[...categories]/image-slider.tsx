"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Button } from "@/components/ui/button";

export type Slide = {
    id: number;
    image: string;
    title: string;
    description: string;
};

type ImageSliderProps = {
    title: string;
    slides: Slide[];
}

export default function ImageSlider({ title, slides }: ImageSliderProps) {
    return (
        <div className="w-full min-h-80 overflow-hidden py-5 space-y-5">
            <h2 className="text-2xl font-semibold text-center">{title}</h2>
            <Swiper
                modules={[Autoplay, FreeMode]}
                slidesPerView={3}
                spaceBetween={20}
                loop={true}
                freeMode={true}
                speed={6000}
                autoplay={{
                    delay: 0,
                    disableOnInteraction: false,
                }}
                allowTouchMove={false}
                breakpoints={{
                    0: {
                        slidesPerView: 1,
                    },
                    640: {
                        slidesPerView: 2,
                    },
                    1024: {
                        slidesPerView: 3,
                    },
                }}
                className="continuous-swiper"
            >
                {slides.concat(slides).map((slide, index) => (
                    <SwiperSlide key={index}>
                        <div className="relative h-80">
                            <img
                                src={slide.image}
                                alt={slide.title}
                                className="w-full h-full object-cover rounded-xl"
                            />

                            <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-white text-center p-4 rounded-xl">
                                <h2 className="text-2xl font-bold mb-2">
                                    {slide.title}
                                </h2>
                                <p>{slide.description}</p>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>

            <div className="text-center space-x-5">
                <Button variant={"outline"} size={"xl"}>
                    Обяви от Монтана
                </Button>
                <Button variant={"outline"} size={"xl"}>
                    Обяви от България
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
