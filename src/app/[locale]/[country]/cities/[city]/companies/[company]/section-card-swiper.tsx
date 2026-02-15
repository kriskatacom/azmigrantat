"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectCube } from "swiper/modules";

import "swiper/css";
import "swiper/css/effect-cube";
import "swiper/css/autoplay";

import AppImage from "@/components/AppImage";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SectionCardProps {
    title: string;
    buttonText?: string;
    content?: string;
    imageSrc?: string;
    companyName?: string;
    href: string;
}

interface SectionCardSwiperProps {
    items: SectionCardProps[];
    className?: string;
    autoplayDelay?: number;
    showContent?: boolean;
    baseHref?: string;
}

const SectionCardSwiper: React.FC<SectionCardSwiperProps> = ({
    items,
    className,
    autoplayDelay = 5000,
    showContent = false,
    baseHref
}) => {
    return (
        <Swiper
            modules={[EffectCube, Autoplay]}
            effect="cube"
            grabCursor={true}
            touchEventsTarget="container"
            resistance={false}
            touchStartPreventDefault={false}
            cubeEffect={{
                shadow: false,
                slideShadows: true,
            }}
            autoplay={{
                delay: autoplayDelay,
                disableOnInteraction: false,
            }}
            loop={true}
            className={cn(className, "w-full h-96 md:h-100 overflow-visible")}
        >
            {items.map((item, idx) => (
                <SwiperSlide key={idx} className="overflow-hidden rounded-md">
                    <Link href={item.href} className="z-40">
                        <div className="relative w-full h-full">
                            {item.imageSrc ? (
                                <AppImage
                                    src={item.imageSrc}
                                    alt={item.companyName ?? "section image"}
                                    fill
                                    className="object-cover rounded"
                                />
                            ) : (
                                <div className="bg-gray-600 w-full h-full flex justify-center items-center text-light text-2xl">
                                    Няма поставено изображение
                                </div>
                            )}
                        </div>
                        {showContent && (
                            <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-center items-center gap-5">
                                <h2 className="z-40 text-center text-light text-2xl xl:text-3xl font-bold uppercase px-5 max-w-xl mx-auto leading-12">
                                    {item.title}
                                </h2>
                                {item.buttonText && (
                                    <Button variant="default" size="xl" className="z-40">
                                        {item.buttonText}
                                    </Button>
                                )}
                            </div>
                        )}
                        <div className="absolute top-0 left-0 w-full h-full bg-black/40 z-10"></div>
                    </Link>
                </SwiperSlide>
            ))}
        </Swiper>
    );
};

export default SectionCardSwiper;
