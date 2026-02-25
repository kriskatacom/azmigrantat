import React, { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import striptags from "striptags";
import { EyeIcon } from "lucide-react";
import { GridColumns } from "./card-grid";
import { useTranslations } from "use-intl";
import SmartImage from "./smart-image";

type LinkType = "internal" | "external";

export type CardEntity = {
    name: string;
    slug: string;
    image_url?: string | null;
    excerpt?: string | null;
    linkType?: LinkType;
};

type CardItemProps = {
    item: CardEntity;
    hrefPrefix?: string;
    variant?: "standart" | "modern";
    height: GridColumns;
};

export const CardItem: React.FC<CardItemProps> = ({
    item,
    hrefPrefix = "",
    variant = "standart",
    height,
}) => {
    const [cellHeight, setCellHeight] = useState(height.base);

    const t = useTranslations("common");

    const getHeight = () => {
        if (typeof window === "undefined") return height.base;

        const w = window.innerWidth;
        if (w >= 1536 && height.xxl) return height.xxl;
        if (w >= 1280 && height.xl) return height.xl;
        if (w >= 1024 && height.lg) return height.lg;
        if (w >= 768 && height.md) return height.md;
        if (w >= 640 && height.sm) return height.sm;

        return height.base;
    };

    useEffect(() => {
        const update = () => setCellHeight(getHeight());
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    if (variant === "standart") {
        return (
            <div
                className="relative rounded-xl overflow-hidden shadow-lg group"
                style={{ height: `${cellHeight}px` }}
            >
                <Link
                    href={
                        item.linkType === "external"
                            ? (item.slug ?? "#")
                            : `${hrefPrefix}/${item.slug}`
                    }
                    target={item.linkType === "external" ? "_blank" : "_self"}
                >
                    <div className="absolute top-0 left-0 w-full h-full">
                        <SmartImage
                            src={item.image_url || "/images/default.webp"}
                            alt={item.name}
                            fill
                            className={`object-cover transition-opacity duration-500`}
                        />
                    </div>

                    <div className="absolute inset-0 bg-black/25" />

                    <div className="absolute bottom-0 left-0 p-5">
                        <span className="text-white font-semibold text-2xl md:text-3xl">
                            {item.name}
                        </span>
                        <div>
                            <button className="inline-block py-2 px-4 mt-5 rounded-md text-white font-semibold text-xl border-2 border-white">
                                {t("information")}
                            </button>
                        </div>
                    </div>
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm transition-shadow duration-300 hover:shadow-lg">
            <Link href={`${hrefPrefix}/${item.slug}`} className="flex h-full">
                {/* Image */}
                <div className="relative w-40 md:w-50 shrink-0">
                    <SmartImage
                        src={item.image_url || "/images/default.webp"}
                        alt={item.name}
                        fill
                        className={`object-cover transition-opacity duration-500`}
                    />
                </div>

                {/* Content */}
                <div className="flex flex-col justify-center items-start gap-2 md:gap-4 p-5 text-left">
                    <h3 className="text-xl md:text-2xl font-semibold text-primary">
                        {item.name}
                    </h3>

                    {item.excerpt && (
                        <div className="text-base text-primary/80 line-clamp-2 text-left">
                            {striptags(item.excerpt.trim())}
                        </div>
                    )}

                    <Button variant="outline" className="text-base md:text-lg">
                        <EyeIcon />
                        <span>Вижте п`овече</span>
                    </Button>
                </div>
            </Link>
        </div>
    );
};