"use client";

import { Check } from "lucide-react";
import { FaCarAlt, FaUser } from "react-icons/fa";
import { IoMdWarning } from "react-icons/io";
import { MdEmail, MdPhone } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Driver } from "@/app/[locale]/travel/shared-travel/_components/drivers-slider";
import AppImage from "@/components/AppImage";

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
