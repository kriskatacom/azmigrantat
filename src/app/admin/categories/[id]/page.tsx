import { Metadata } from "next";
import Link from "next/link";
import { websiteName } from "@/lib/utils";
import { FiPlus } from "react-icons/fi";
import MainSidebarServer from "@/components/main-sidebar/main-sidebar-server";
import CategoryForm from "@/app/admin/categories/[id]/category-form";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { Button } from "@/components/ui/button";
import { getCityByColumn } from "@/lib/services/city-service";
import {
    getCategoryByColumn,
    getCategoryTree,
} from "@/lib/services/category-service";

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    if (id !== "new") {
        const city = await getCityByColumn("id", id);

        if (city) {
            return {
                title: websiteName("Редактиране на града"),
            };
        }
    }

    return {
        title: websiteName("Добавяне на нов град"),
    };
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export default async function NewCity({ params }: Params) {
    const { id } = await params;
    let category = null;

    if (id !== "new") {
        category = await getCategoryByColumn("id", id);
    }

    const categories = await getCategoryTree();

    const breadcrumbs = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Категории", href: "/admin/categories" },
        {
            name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
        },
    ];

    return (
        <div className="flex">
            <MainSidebarServer />
            <main className="flex-1">
                <div className="border-b flex items-center gap-5">
                    <h1 className="text-2xl font-semibold p-5">
                        {category
                            ? "Редактиране на категорията"
                            : "Добавяне на нова категория"}
                    </h1>
                    <Link href="/admin/categories/new">
                        <Button variant={"default"} size={"xl"}>
                            <FiPlus />
                            <span>Добавяне</span>
                        </Button>
                    </Link>
                </div>
                <Breadcrumbs items={breadcrumbs} />
                <CategoryForm category={category} categories={categories} />
                {category?.id && (
                    <>
                        <h2 className="px-5 text-xl font-semibold">
                            Изображение
                        </h2>
                        <ImageUpload
                            imageUrl={category.image_url as string}
                            url={
                                category?.id
                                    ? `/api/categories/${category.id}/upload`
                                    : ""
                            }
                        />
                    </>
                )}
            </main>
        </div>
    );
}

export type CategoryNode = {
    id: number;
    name: string;
    children: CategoryNode[];
};

export function buildCategoryTree(
    categories: { id: number; name: string; parentId: number | null }[],
    excludeId: number | null = null,
    parentId: number | null = null,
): CategoryNode[] {
    return categories
        .filter((cat) => cat.parentId === parentId && cat.id !== excludeId)
        .map((cat) => {
            const children = buildCategoryTree(categories, excludeId, cat.id);

            return {
                id: cat.id,
                name: cat.name,
                children,
            };
        });
}
