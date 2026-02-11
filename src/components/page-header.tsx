import React, { ReactNode } from "react";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import { websiteName } from "@/lib/utils";
import AppImage from "@/components/AppImage";
import { Banner } from "@/lib/types";

interface PageHeaderProps {
    title?: ReactNode;
    breadcrumbs: BreadcrumbItem[];
    banner?: Banner | null;
}

const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    breadcrumbs,
    banner,
}) => {
    const hasBannerContent =
        Boolean(banner?.name?.trim()) && Boolean(banner?.description?.trim());

    return (
        <>
            {banner && (
                <div
                    className="relative w-full shrink-0"
                    style={{ height: `${banner.height}px` }}
                >
                    {banner.image ? (
                        <div className="relative w-full h-full">
                            <AppImage
                                src={banner.image}
                                alt={websiteName("Пътуване")}
                                fill
                                className="object-cover rounded"
                            />
                            {hasBannerContent && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                                    <div className="absolute inset-0 bg-black/50 z-10"></div>

                                    <div className="relative z-20 text-light max-w-3xl">
                                        {banner.name?.trim() && (
                                            <h2 className="text-2xl xl:text-3xl 2xl:text-4xl font-bold uppercase mb-4">
                                                {banner.name}
                                            </h2>
                                        )}

                                        {banner.description?.trim() && (
                                            <p className="max-w-lg mx-auto text-lg">
                                                {banner.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-gray-600 w-full h-full flex justify-center items-center text-light text-2xl">
                            Няма поставено изображение
                        </div>
                    )}
                </div>
            )}
            <div className="text-center bg-website-menu-item py-5 xl:py-10">
                {title && (
                    <h1 className="text-light text-2xl xl:text-3xl 2xl:text-4xl font-bold uppercase">
                        {title}
                    </h1>
                )}

                <div className="text-white text-lg flex justify-center">
                    <Breadcrumbs items={breadcrumbs} classes="justify-center" />
                </div>
            </div>
        </>
    );
};

export default PageHeader;
