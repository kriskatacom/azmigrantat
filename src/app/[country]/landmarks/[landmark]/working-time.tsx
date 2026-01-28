"use client";

import { Landmark } from "@/lib/types";
import { MdLocationPin, MdLockClock, MdPunchClock } from "react-icons/md";

type Props = {
    landmark: Landmark;
};

export default function WorkingTime({ landmark }: Props) {
    return (
        <section className="bg-white shadow-sm rounded-sm">
            <div className="flex flex-col md:px-2 gap-1 md:gap-2 max-md:mt-2 px-2">
                <h2 className="flex items-center gap-2 md:text-2xl font-semibold max-sm:text-xs border-b md:p-5 pb-2">
                    <MdPunchClock className="text-xl md:text-4xl" />
                    <span>Работно време</span>
                </h2>
            </div>

            <div className="relative max-sm:text-xs p-2 md:p-5">
                <div
                    dangerouslySetInnerHTML={{
                        __html: landmark.working_time as string,
                    }}
                />
            </div>
        </section>
    );
}
