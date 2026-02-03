import { Metadata } from "next";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { websiteName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import MainSidebarServer from "@/components/main-sidebar/main-sidebar-server";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/admin/categories/client-page";
import { CategoryWithCategory } from "@/app/admin/categories/columns";
import {
    getCategories,
    getCategoryByColumn,
} from "@/lib/services/category-service";
import { Category } from "@/lib/types";
import { MdCategory } from "react-icons/md";

export const metadata: Metadata = {
    title: websiteName("Категории"),
};

type CityProps = {
    searchParams: Promise<{
        parent: string;
        show: string;
    }>;
};

export default async function Categories({ searchParams }: CityProps) {
    const parentSlug = (await searchParams).parent;
    const show = (await searchParams).show;
    let parentCategory: Category | null = null;
    let categories: CategoryWithCategory[] = [];

    let breadcrumbs: BreadcrumbItem[] = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Категории", href: "/admin/categories" },
    ];

    if (parentSlug) {
        parentCategory = await getCategoryByColumn("slug", parentSlug);
    }

    if (parentCategory && parentCategory.name) {
        breadcrumbs.push({
            name: parentCategory.name,
            href: `/admin/categories?category=${parentCategory.slug}`,
        });

        categories = await getCategories({
            column: "parent_id",
            value: parentCategory.id,
        });
    } else {
        if (show === "main-categories") {
            categories = await getCategories({
                column: "parent_id",
                value: null,
            });

            breadcrumbs.push({
                name: "Основни категории",
            });
        } else {
            categories = await getCategories();
        }
    }

    return (
        <div className="flex">
            <MainSidebarServer />

            <main className="flex-1">
                <div className="flex items-center gap-5 border-b">
                    <h1 className="text-2xl font-semibold p-5">Категории</h1>

                    <Link href="/admin/categories/new">
                        <Button variant={"default"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>

                    <Link href="/admin/categories?show=main-categories">
                        <Button variant={"default"} size={"xl"}>
                            <MdCategory />
                            <span>Основни категории</span>
                        </Button>
                    </Link>
                </div>

                <Breadcrumbs items={breadcrumbs} />

                <ClientPage data={categories} />
            </main>
        </div>
    );
}