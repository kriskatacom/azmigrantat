"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

import { DriverSingle } from "@/app/[locale]/travel/shared-travel/_components/driver-single";

export interface Driver {
    id: string | number;
    name: string;
    age: number;
    image: string;
    car: string | null;
    email?: string;
    phone?: string;
    verified?: boolean;
}

export default function DriversSlider() {
    const drivers: Driver[] = [
        {
            id: 1,
            name: "Мария Иванова",
            age: 30,
            image: "/images/shared-travel/drivers/01.jpg",
            car: null,
            email: "scott@email.com",
            phone: "+359888123456",
            verified: true,
        },
        {
            id: 2,
            name: "Daniel Carter",
            age: 34,
            image: "/images/shared-travel/drivers/02.jpg",
            car: "BMW 320d",
            email: "daniel.carter@email.com",
            phone: "+359888654321",
            verified: true,
        },
        {
            id: 3,
            name: "Michael Stone",
            age: 28,
            image: "/images/shared-travel/drivers/03.jpg",
            car: "Audi A4",
            email: "michael.stone@email.com",
            phone: "+359887112233",
            verified: false,
        },
        {
            id: 4,
            name: "Alexander Reed",
            age: 41,
            image: "/images/shared-travel/drivers/04.jpg",
            car: "Volkswagen Passat",
            email: "alex.reed@email.com",
            phone: "+359889445566",
            verified: true,
        },
    ];

    return (
        <div className="max-w-5xl mx-auto">
            <Swiper
                spaceBetween={20}
                slidesPerView={1}
                breakpoints={{
                    640: { slidesPerView: 1 },
                    768: { slidesPerView: 2 },
                }}
                effect={"slide"}
                modules={[Autoplay]}
                loop={true}
                grabCursor={true}
                autoplay={{
                    delay: 3000,
                    disableOnInteraction: false,
                }}
            >
                {drivers.map((driver) => (
                    <SwiperSlide key={driver.id}>
                        <DriverSingle
                            driver={driver}
                            onProfileClick={(d) => console.log("Clicked:", d)}
                        />
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
}
