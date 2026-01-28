"use client";

import { Embassy } from "@/lib/types";
import { MdEmail, MdLocationCity, MdLocationPin, MdPhone, MdWeb } from "react-icons/md";

type Props = {
    embassy: Embassy;
};

export default function ContactsDescription({ embassy }: Props) {
    return (
        <section className="bg-white shadow-sm rounded-sm">
            <div className="flex flex-col md:px-2 gap-1 md:gap-2 max-md:mt-2 px-2">
                <h2 className="flex items-center gap-2 md:text-2xl font-semibold max-sm:text-xs border-b md:p-5 pb-2">
                    <MdLocationPin className="text-xl md:text-4xl" />
                    <span>Информация за контакти</span>
                </h2>
            </div>

            <div className="relative max-sm:text-xs px-2 py-1 md:px-5 md:pt-5 flex items-center gap-2">
                <MdLocationCity className="min-w-5 text-xl md:text-3xl" />
                <span className="break-all">{embassy.address}</span>
            </div>
            <div className="relative max-sm:text-xs px-2 py-1 md:px-5 flex items-center gap-2">
                <MdPhone className="min-w-5 text-xl md:text-3xl" />
                <span className="break-all">{embassy.phone}</span>
            </div>
            <div className="relative max-sm:text-xs px-2 py-1 md:px-5 flex items-center gap-2">
                <MdEmail className="min-w-5 text-xl md:text-3xl" />
                <span className="break-all">{embassy.email}</span>
            </div>
            <div className="relative max-sm:text-xs px-2 py-1 md:px-5 md:pb-5 flex items-center gap-2">
                <MdWeb className="min-w-5 text-xl md:text-3xl" />
                <span className="break-all">{embassy.website_link}</span>
            </div>
        </section>
    );
}
