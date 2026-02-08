"use client";

import { FaFax } from "react-icons/fa";
import { IoMdGlobe } from "react-icons/io";
import {
    MdEmail,
    MdLocationCity,
    MdLocationPin,
    MdPhone,
} from "react-icons/md";
import { Embassy } from "@/lib/types";

type Props = {
    embassy: Embassy;
};

export default function ContactsDescription({ embassy }: Props) {
    const hasEmbassyContent =
        embassy?.address ||
        embassy?.phone ||
        embassy?.email ||
        embassy?.fax ||
        embassy?.website_link;
    
    return (
        <section className="bg-white shadow-sm rounded-sm">
            <div className="flex flex-col md:px-2 gap-1 md:gap-2 max-md:mt-2 px-2">
                <h2 className="flex items-center gap-2 md:text-2xl font-semibold max-sm:text-xs border-b md:p-5 pb-2">
                    <MdLocationPin className="text-xl md:text-4xl" />
                    <span>Информация за контакти</span>
                </h2>
            </div>

            {(hasEmbassyContent && (
                <div className="md:py-5">
                    {embassy.address && (
                        <div className="relative max-sm:text-xs px-2 py-1 md:px-5 flex items-center gap-2">
                            <MdLocationCity className="min-w-5 text-xl md:text-3xl" />
                            <span className="break-all">{embassy.address}</span>
                        </div>
                    )}
                    {embassy.phone && (
                        <div className="relative max-sm:text-xs px-2 py-1 md:px-5 flex items-center gap-2">
                            <MdPhone className="min-w-5 text-xl md:text-3xl" />
                            <span className="break-all">
                                <a href={`tel:${embassy.phone}`}>
                                    {embassy.phone}
                                </a>
                            </span>
                        </div>
                    )}
                    {embassy.email && (
                        <div className="relative max-sm:text-xs px-2 py-1 md:px-5 flex items-center gap-2">
                            <MdEmail className="min-w-5 text-xl md:text-3xl" />
                            <span className="break-all">
                                <a href={`mailto:${embassy.email}`}>
                                    {embassy.email}
                                </a>
                            </span>
                        </div>
                    )}
                    {embassy.fax && (
                        <div className="relative max-sm:text-xs px-2 py-1 md:px-5 flex items-center gap-2">
                            <FaFax className="min-w-5 text-xl md:text-3xl" />
                            <span className="break-all">
                                <a href={`tel:${embassy.fax}`}>{embassy.fax}</a>
                            </span>
                        </div>
                    )}
                    {embassy.website_link && (
                        <div className="relative max-sm:text-xs px-2 py-1 md:px-5 flex items-center gap-2">
                            <IoMdGlobe className="min-w-5 text-xl md:text-3xl" />
                            <span className="break-all">
                                <a href={embassy.website_link} target="_blank">
                                    {embassy.website_link}
                                </a>
                            </span>
                        </div>
                    )}
                </div>
            )) || (
                <div className="my-5 ml-5">
                    <div className="text-muted-foreground">
                        Няма добавено описание
                    </div>
                </div>
            )}
        </section>
    );
}