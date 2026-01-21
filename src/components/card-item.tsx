import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export type CardEntity = {
    name: string;
    slug: string;
    imageUrl?: string | null;
    excerpt?: string | null;
};

type CardItemProps = {
    item: CardEntity;
    hrefPrefix?: string;
    variant?: "standart" | "modern";
};

export const CardItem: React.FC<CardItemProps> = ({
    item,
    hrefPrefix = "",
    variant = "standart",
}) => {
    const [imageLoading, setImageLoading] = React.useState(true);

    if (variant === "standart") {
        return (
            <div className="relative h-60 rounded-xl overflow-hidden shadow-lg group">
                <Link href={`${hrefPrefix}/${item.slug}`}>
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                        style={{
                            backgroundImage: `url(${item.imageUrl || "/images/default.webp"})`,
                        }}
                    />

                    <div className="absolute inset-0 bg-black/25" />

                    <div className="absolute bottom-0 left-0 p-5">
                        <span className="text-white font-semibold text-2xl md:text-3xl">
                            {item.name}
                        </span>
                        <div>
                            <button className="inline-block py-2 px-4 mt-5 rounded-md text-white font-semibold text-xl border-2 border-white">
                                Информация
                            </button>
                        </div>
                    </div>
                </Link>
            </div>
        );
    }

    return (
        <div className="border rounded-2xl overflow-hidden shadow-sm transition-shadow duration-300 hover:shadow-lg">
            <Link
                href={`${hrefPrefix}/${item.slug}`}
                className="flex h-full"
            >
                {/* Image */}
                <div className="relative w-40 shrink-0">
                    <Image
                        src={item.imageUrl || "/images/default.webp"}
                        alt={item.name}
                        fill
                        className={`object-cover transition-opacity duration-500 ${
                            imageLoading ? "opacity-0" : "opacity-100"
                        }`}
                        onLoad={() => setImageLoading(false)}
                        onError={() => setImageLoading(false)}
                    />
                </div>

                {/* Content */}
                <div className="flex flex-col justify-center gap-2 p-5">
                    <h3 className="text-xl font-semibold text-primary">
                        {item.name}
                    </h3>

                    {item.excerpt && (
                        <p className="text-sm text-primary/80 line-clamp-2">
                            {item.excerpt}
                        </p>
                    )}

                    <Button variant="outline" className="w-fit">
                        Вижте повече
                    </Button>
                </div>
            </Link>
        </div>
    );
};
