import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import CategoryForm from "@/app/[locale]/admin/categories/[id]/category-form";
import ImageUpload from "@/components/image-upload";
import { Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getCityByColumn } from "@/lib/services/city-service";
import {
    getCategoryByColumn,
    getCategoryTree,
} from "@/lib/services/category-service";
import PageHeader from "@/components/admin/page-header";
import {
    TranslationInfo,
    TranslationService,
} from "@/lib/services/translations-service";
import MakeTranslations from "@/components/make-translations";

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
    const isNew = id === "new";

    const categoryPromise = !isNew
        ? getCategoryByColumn("id", id)
        : Promise.resolve(null);
    const categoriesPromise = getCategoryTree();
    const [category, categories] = await Promise.all([
        categoryPromise,
        categoriesPromise,
    ]);

    let translationInfo: TranslationInfo = { count: 0, languages: [] };

    if (category) {
        const translationService = new TranslationService();

        const [tInfo] = await Promise.all([
            translationService.getAvailableLanguagesForEntity("category", id),
        ]);

        translationInfo = tInfo;
    }

    const breadcrumbs = [
        { name: "Табло", href: "/admin/dashboard" },
        { name: "Категории", href: "/admin/categories" },
        {
            name: `${id !== "new" ? "Редактиране" : "Добавяне"}`,
        },
    ];

    return (
        <main className="flex-1">
            <PageHeader
                title={
                    category
                        ? "Редактиране на категорията"
                        : "Добавяне на нова категория"
                }
                link="/admin/categories/new"
            />

            <Breadcrumbs items={breadcrumbs} />

            {category?.id && (
                <MakeTranslations
                    entityType="category"
                    entityId={category.id}
                    translationInfo={translationInfo}
                    fields={[
                        { value: "name", label: "Име", type: "text" },
                        {
                            value: "heading",
                            label: "Заглавие на страницата",
                            type: "text",
                        },
                    ]}
                    textsToTranslate={[
                        category.name || "",
                        category.heading || "",
                    ]}
                />
            )}

            <CategoryForm category={category} categories={categories} />

            {category?.id && (
                <>
                    <h2 className="px-5 text-xl font-semibold">Изображение</h2>
                    <ImageUpload
                        image_url={category.image_url as string}
                        url={
                            category?.id
                                ? `/api/categories/${category.id}/upload`
                                : ""
                        }
                    />
                </>
            )}

            {category?.id && (
                <>
                    <h2 className="px-5 text-xl font-semibold">Изображение за фон на компаниите от категорията</h2>
                    <ImageUpload
                        image_url={category.companies_background_url as string}
                        url={
                            category?.id
                                ? `/api/categories/${category.id}/companies-background-url-upload`
                                : ""
                        }
                    />
                </>
            )}
        </main>
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
