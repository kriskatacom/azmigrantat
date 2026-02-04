import React, { ReactNode } from "react";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";

interface PageHeaderProps {
    title: ReactNode;
    breadcrumbs: BreadcrumbItem[];
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, breadcrumbs }) => {
    return (
        <div className="text-center bg-website-menu-item py-5 xl:py-10">
            <h1 className="text-light text-2xl xl:text-3xl 2xl:text-4xl font-bold uppercase">
                {title}
            </h1>

            <div className="text-white text-lg flex justify-center">
                <Breadcrumbs items={breadcrumbs} classes="justify-center" />
            </div>
        </div>
    );
};

export default PageHeader;
