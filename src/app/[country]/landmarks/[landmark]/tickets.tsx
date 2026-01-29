"use client";

import { Landmark } from "@/lib/types";
import { FaGlobe } from "react-icons/fa";
import { GiMoneyStack } from "react-icons/gi";
import { FaLocationPin } from "react-icons/fa6";
import { MdLocationPin, MdPhone } from "react-icons/md";

type Props = {
    landmark: Landmark;
};

export default function Tickets({ landmark }: Props) {
    return (
        <section className="bg-white shadow-sm rounded-sm">
            <div className="flex flex-col md:px-2 gap-1 md:gap-2 max-md:mt-2 px-2">
                <h2 className="flex items-center gap-2 md:text-2xl font-semibold max-sm:text-xs border-b md:p-5 pb-2">
                    <MdLocationPin className="text-xl md:text-4xl" />
                    <span>Информация за контакти</span>
                </h2>
            </div>

            <div className="md:py-5">
                {landmark.address && (
                    <div className="relative max-sm:text-xs px-2 py-1 md:px-5 flex items-center gap-2">
                        <FaLocationPin className="min-w-5 text-xl md:text-3xl" />
                        <span className="break-all">{landmark.address}</span>
                    </div>
                )}
                {landmark.phone && (
                    <div className="relative max-sm:text-xs px-2 py-1 md:px-5 flex items-center gap-2">
                        <MdPhone className="min-w-5 text-xl md:text-3xl" />
                        <span className="break-all">
                            <a href={`tel:${landmark.phone}`}>
                                {landmark.phone}
                            </a>
                        </span>
                    </div>
                )}
                {landmark.website_link && (
                    <div className="relative max-sm:text-xs px-2 py-1 md:px-5 flex items-center gap-2">
                        <FaGlobe className="min-w-5 text-xl md:text-3xl" />
                        <span className="break-all">
                            <a href={landmark.website_link} target="_blank">
                                {landmark.website_link}
                            </a>
                        </span>
                    </div>
                )}
                {landmark.ticket_tax && (
                    <div className="relative max-sm:text-xs px-2 py-1 md:px-5 flex items-center gap-2">
                        <GiMoneyStack className="min-w-5 text-xl md:text-3xl" />
                        <span className="break-all">{landmark.ticket_tax}</span>
                    </div>
                )}
            </div>
        </section>
    );
}
