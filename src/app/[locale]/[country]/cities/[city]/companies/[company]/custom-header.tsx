import { ReactNode } from "react";
import { Banner } from "@/lib/types";
import AppImage from "@/components/AppImage";
import { websiteName } from "@/lib/utils";
import { DescriptionDialog } from "@/app/[locale]/[country]/cities/[city]/companies/[company]/description-dialog";

interface PageHeaderProps {
    title: ReactNode;
    description?: string;
    banner?: Banner | null;
}

export default function CustomHeader({
    title,
    description,
    banner,
}: PageHeaderProps) {
    return (
        <>
            {banner && (
                <div className="relative w-full h-80 lg:h-100 shrink-0">
                    <div className="absolute top-0 left-0 w-full h-full bg-black/40 z-10"></div>
                    {banner.image ? (
                        <AppImage
                            src={banner.image}
                            alt={websiteName(banner.name)}
                            fill
                            className="object-cover rounded w-full h-full"
                        />
                    ) : (
                        <div className="bg-gray-600 w-full h-full flex justify-center items-center text-light text-2xl">
                            Няма поставено изображение
                        </div>
                    )}
                    <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center z-20">
                        <div className="space-y-5">
                            <h1 className="max-lg:text-center text-light text-2xl xl:text-3xl 2xl:text-5xl font-bold uppercase px-5">
                                {title}
                            </h1>
                            <div className="text-center">
                                {description && (
                                    <DescriptionDialog
                                        title="Описание на компанията"
                                        description={description}
                                        triggerText="Научете повече за нас"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-30 bg-linear-to-b from-transparent to-white"></div>
                </div>
            )}
        </>
    );
}
