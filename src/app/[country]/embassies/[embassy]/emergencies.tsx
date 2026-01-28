"use client";

import { PhoneIcon } from "lucide-react";
import { MdEmail, MdLocationCity, MdPhone, MdWeb } from "react-icons/md";
import { Embassy } from "@/lib/types";

type Props = {
    embassy: Embassy;
};

export default function Emergencies({ embassy }: Props) {
    return (
        <section className="bg-white shadow-sm rounded-sm">
            <div className="flex flex-col md:px-2 gap-1 md:gap-2 max-md:mt-2 px-2">
                <h2 className="flex items-center gap-2 md:text-2xl font-semibold max-sm:text-xs border-b md:p-5 pb-2">
                    <PhoneIcon className="text-xl md:text-4xl text-red-500" />
                    <span>Спешни случаи</span>
                </h2>
            </div>
            <div className="relative max-sm:text-xs p-2 md:px-5 md:pt-5 flex items-center gap-2">
                <MdPhone className="text-xl md:text-3xl" />
                <span>{embassy.phone}</span>
            </div>
        </section>
    );
}