"use client";

import { useState } from "react";
import { Embassy } from "@/lib/types";
import { Button } from "@/components/ui/button";

type Props = {
    embassy: Embassy;
};

export default function Description({ embassy }: Props) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white border rounded-md overflow-hidden h-fit">
            <h2 className="text-white bg-website-dark text-2xl font-semibold text-center p-5">
                Информация за посолството
            </h2>

            <div className="relative">
                <div
                    className={`text-editor transition-all duration-300 ${
                        expanded ? "max-h-none" : "max-h-40 overflow-hidden"
                    }`}
                    dangerouslySetInnerHTML={{
                        __html: embassy.content as string,
                    }}
                />

                {/* Fade ефект */}
                {!expanded && (
                    <div className="pointer-events-none absolute bottom-0 left-0 h-16 w-full bg-linear-to-t from-white to-transparent" />
                )}
            </div>

            <div className="flex justify-center mb-5">
                <Button
                    variant={"ghost"}
                    size={"xl"}
                    onClick={() => setExpanded(!expanded)}
                    className="text-website-dark font-semibold hover:underline"
                >
                    {expanded ? "Показване на по-малко" : "Показване на още"}
                </Button>
            </div>
        </div>
    );
}
