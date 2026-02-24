"use client";

import { Check } from "lucide-react";
import { FaCarAlt, FaUser } from "react-icons/fa";
import { MdEmail, MdPhone } from "react-icons/md";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

import { Button } from "@/components/ui/button";
import AppImage from "@/components/AppImage";
import { IoMdWarning } from "react-icons/io";

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

export default function DriversGrid() {
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

interface DriverSingleProps {
    driver: Driver;
    onProfileClick?: (driver: Driver) => void;
}

export function DriverSingle({ driver, onProfileClick }: DriverSingleProps) {
    return (
        <div className="bg-white p-5 rounded-md shadow-md flex items-start gap-5">
            <div className="relative min-w-25 min-h-25 rounded-full overflow-hidden border-2 border-shate shadow-md">
                <AppImage
                    src={driver.image}
                    alt={driver.name}
                    className="object-cover"
                    fill
                />
            </div>

            <div className="flex-1 space-y-2">
                <div className="text-2xl font-semibold">{driver.name}</div>

                {(driver.verified && (
                    <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 font-bold text-white bg-green-500 rounded-full p-0.5" />
                        <span className="text-green-500">Потвърден профил</span>
                    </div>
                )) || (
                    <div className="flex items-center gap-2">
                        <IoMdWarning className="w-5 h-5 font-bold text-white bg-yellow-500 rounded-full p-0.5" />
                        <span className="text-yellow-500">
                            Непотвърден профил
                        </span>
                    </div>
                )}

                <div className="flex gap-5">
                    <div className="flex items-center gap-2">
                        <FaUser className="w-5 h-5" />
                        <span>{driver.age} г.</span>
                    </div>

                    {driver.email && (
                        <div className="flex items-center gap-2">
                            <MdEmail className="w-5 h-5" />
                        </div>
                    )}

                    {driver.phone && (
                        <div className="flex items-center gap-2">
                            <MdPhone className="w-5 h-5" />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <FaCarAlt className="w-5 h-5" />
                    {(driver.car && <span>{driver.car}</span>) || (
                        <span className="text-muted-foreground">
                            Няма информация
                        </span>
                    )}
                </div>

                <div>
                    <Button
                        size="lg"
                        className="w-full"
                        onClick={() => onProfileClick?.(driver)}
                    >
                        Преглед на профила
                    </Button>
                </div>
            </div>
        </div>
    );
}
