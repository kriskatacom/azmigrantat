"use client";

import { LiaLandmarkSolid } from "react-icons/lia";
import { Embassy } from "@/lib/types";
import { Button } from "@/components/ui/button";

type Props = {
    embassy: Embassy;
};

export default function Description({ embassy }: Props) {
    return (
        <section className="bg-white shadow-sm rounded-sm overflow-hidden">
            <div className="flex flex-col md:px-2 gap-1 md:gap-2 max-md:mt-2 px-2">
                <h2 className="flex items-center gap-2 md:text-2xl font-semibold max-sm:text-xs border-b md:p-5 pb-2">
                    <LiaLandmarkSolid className="text-xl md:text-4xl" />
                    <span>За посолството</span>
                </h2>
            </div>

            <div className="px-2 md:px-5 md:mt-5">
                <a href={embassy.website_link} target="_blank">
                    <Button className="bg-website-dark hover:bg-website-menu-item max-sm:text-xs max-md:w-full">
                        Повече информация
                    </Button>
                </a>
            </div>

            <div className="relative max-sm:text-xs p-2 md:p-5 overflow-hidden">
                <div
                    dangerouslySetInnerHTML={{
                        __html: embassy.content as string,
                    }}
                />
            </div>
        </section>
    );
}
