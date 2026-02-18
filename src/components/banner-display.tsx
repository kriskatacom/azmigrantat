"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { websiteName } from "@/lib/utils";
import { Banner } from "@/lib/types";
import AppImage from "@/components/AppImage";

interface BannerDisplayProps {
    banner: Banner;
}

export default function BannerDisplay({ banner }: BannerDisplayProps) {
    const hasContent =
        (banner.show_name && banner.name?.trim()) ||
        (banner.show_description && banner.description?.trim());

    const positionMap: Record<string, string> = {
        top_left: "items-start justify-start text-left py-3 px-5",
        top_center: "items-start justify-center text-center py-5",
        top_right: "items-start justify-end text-right py-3 px-5",
        center_left: "items-center justify-start text-left px-5",
        center_center: "items-center justify-center text-center",
        center_right: "items-center justify-end text-right py-3 px-5",
        bottom_left: "items-end justify-start text-left py-3 px-5",
        bottom_center: "items-end justify-center text-center py-3",
        bottom_right: "items-end justify-end text-right py-3 px-5",
    };

    const flexPosition =
        positionMap[banner.content_place] ?? "items-center justify-center";

    const content = (
        <div className="relative w-full h-full">
            <AppImage
                src={banner.image ?? ""}
                alt={websiteName("Пътуване")}
                fill
                className="object-cover rounded"
            />

            {hasContent && (
                <div className={`absolute inset-0 flex px-4 ${flexPosition}`}>
                    {banner.show_overlay && (
                        <div className="absolute inset-0 bg-black/50 z-10 rounded"></div>
                    )}

                    <div className="relative z-20 text-light max-w-3xl">
                        {banner.show_name && banner.name?.trim() && (
                            <h2 className="text-2xl xl:text-3xl 2xl:text-4xl font-semibold mb-5">
                                {banner.name}
                            </h2>
                        )}

                        {banner.show_description &&
                            banner.description?.trim() && (
                                <p className="max-w-lg mx-auto text-lg mb-5">
                                    {banner.description}
                                </p>
                            )}

                        {banner.show_button && banner.button_text && (
                            <Button
                                variant={"ghost"}
                                className="border mb-2"
                                size={"xl"}
                            >
                                {banner.button_text}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    if (banner.href) {
        return (
            <Link href={banner.href} className="block relative w-full" passHref>
                <div style={{ height: `${banner.height}px` }}>{content}</div>
            </Link>
        );
    }

    return <div className="relative w-full h-50 pt-2">{content}</div>;
}
