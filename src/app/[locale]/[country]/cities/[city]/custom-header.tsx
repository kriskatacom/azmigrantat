import { ReactNode } from "react";
import Link from "next/link";
import { Banner } from "@/lib/types";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import AppImage from "@/components/AppImage";
import { websiteName } from "@/lib/utils";

interface PageHeaderProps {
    title: ReactNode;
    breadcrumbs: BreadcrumbItem[];
    banner?: Banner | null;
    municipalitiesLink: string;
}

export default function CustomHeader({
    title,
    breadcrumbs,
    banner,
    municipalitiesLink,
}: PageHeaderProps) {
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
                            alt={websiteName(banner.name)}
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
            <div className="bg-website-menu-item py-5 xl:py-10">
                <div className="container mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="max-lg:text-center text-light text-2xl xl:text-3xl 2xl:text-4xl font-bold uppercase px-5">
                            {title}
                        </h1>

                        <div className="text-white text-lg flex max-lg:justify-center">
                            <Breadcrumbs
                                items={breadcrumbs}
                                classes="max-lg:justify-center"
                            />
                        </div>
                    </div>
                    <div className="hidden lg:block">
                        <Link href={municipalitiesLink}>
                            <button className="py-3 px-5 rounded-md text-lg bg-website-blue cursor-pointer">
                                Общински градове
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}