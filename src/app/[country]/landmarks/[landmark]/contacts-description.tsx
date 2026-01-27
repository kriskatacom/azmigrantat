"use client";

import { useState } from "react";
import { Landmark } from "@/lib/types";
import { Button } from "@/components/ui/button";

type Props = {
    landmark: Landmark;
    image: string;
};

export default function ContactsDescription({ landmark, image }: Props) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="relative border rounded-md overflow-hidden h-fit shadow-lg">
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${image}')` }}
            />
            <div className="absolute inset-0 bg-black/60" />

            <div className="relative z-10">
                <h2 className="text-white text-2xl font-semibold text-center p-5 bg-black/50">
                    Информация за контакти
                </h2>

                <div className="relative">
                    <div
                        className={`text-editor transition-all duration-500 p-5 ${
                            expanded ? "max-h-none" : "max-h-80 overflow-hidden"
                        }`}
                        style={{ color: "white" }}
                        dangerouslySetInnerHTML={{
                            __html: landmark.contacts_content as string,
                        }}
                    />

                    {!expanded && (
                        <div className="pointer-events-none absolute bottom-0 left-0 w-full h-24 bg-linear-to-t from-black to-black/10" />
                    )}
                </div>

                <div className="flex justify-center py-5 bg-black">
                    <Button
                        variant={"default"}
                        size={"lg"}
                        onClick={() => setExpanded(!expanded)}
                        className="text-white font-semibold hover:bg-white/20 transition-colors duration-300 flex items-center gap-2"
                    >
                        {expanded
                            ? "Показване на по-малко"
                            : "Показване на още"}
                        <span
                            className={`transition-transform duration-300 ${
                                expanded ? "rotate-180" : "rotate-0"
                            }`}
                        >
                            ▼
                        </span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
