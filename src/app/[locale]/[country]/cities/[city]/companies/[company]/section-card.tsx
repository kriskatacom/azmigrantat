import React from "react";
import { Button } from "@/components/ui/button";
import AppImage from "@/components/AppImage";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface SectionCardProps {
    title: string;
    buttonText?: string;
    content?: string;
    imageSrc?: string;
    companyName?: string;
    className?: string;
    href: string;
}

const SectionCard: React.FC<SectionCardProps> = ({
    title,
    buttonText,
    content,
    imageSrc,
    companyName,
    className,
    href,
}) => {
    return (
        <div
            className={cn(
                className,
                "relative w-full h-80 lg:h-100 shrink-0 flex items-center justify-center",
            )}
        >
            {imageSrc ? (
                <AppImage
                    src={imageSrc}
                    alt={companyName ?? "section image"}
                    fill
                    className="object-cover rounded"
                />
            ) : (
                <div className="bg-gray-600 w-full h-full flex justify-center items-center text-light text-2xl">
                    Няма поставено изображение
                </div>
            )}

            <div className="absolute top-0 left-0 w-full h-full">
                <div className="flex flex-col justify-center items-center gap-5 w-full h-full">
                    <h2 className="z-40 max-lg:text-center text-light text-2xl xl:text-3xl font-bold uppercase px-5">
                        {title}
                    </h2>
                    {content && (
                        <div
                            className="z-40 max-w-md mx-auto text-center text-white text-lg px-5"
                            dangerouslySetInnerHTML={{ __html: content }}
                        ></div>
                    )}
                    {buttonText && (
                        <Link href={href} className="z-40">
                            <Button variant={"default"} size={"xl"}>
                                {buttonText}
                            </Button>
                        </Link>
                    )}
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-black/40 z-10"></div>
            </div>
        </div>
    );
};

export default SectionCard;
