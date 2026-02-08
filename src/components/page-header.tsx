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
    return (
        <>
            {banner && (
                <div
                    className="relative w-full shrink-0"
                    style={{ height: `${banner.height}px` }}
                >
                    {banner.image ? (
                        <AppImage
                            src={banner.image}
                            alt={websiteName("Пътуване")}
                            fill
                            className="object-cover rounded w-full h-full"
                        />
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
                    <Breadcrumbs items={breadcrumbs} classes="justify-center pt-0" />
                </div>
            </div>
        </>
    );
};

export default PageHeader;