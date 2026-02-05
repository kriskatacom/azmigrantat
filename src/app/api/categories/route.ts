import { NextResponse } from "next/server";
import { generateSlug } from "@/app/api/lib";
import { NewCategory } from "@/app/[locale]/admin/categories/[id]/category-form";
import {
    createCategory,
    getCategoryByColumn,
    updateCategory,
} from "@/lib/services/category-service";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function makeUniqueSlug(slug: string) {
    let uniqueSlug = slug;
    let counter = 2;

    while (await getCategoryByColumn("slug", uniqueSlug)) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
}

export async function POST(req: Request) {
    try {
        const data: NewCategory = await req.json();

        if (process.env.NODE_ENV === "development") {
            await delay(100);
        }

        console.log(data);

        /**
         * =========================
         * UPDATE CATEGORY
         * =========================
         */
        if (data.id) {
            const categoryId = Number(data.id);

            if (isNaN(categoryId)) {
                return NextResponse.json(
                    { success: false, error: "Invalid category id" },
                    { status: 400 },
                );
            }

            const category = await getCategoryByColumn("id", categoryId);

            if (!category) {
                return NextResponse.json(
                    { success: false, error: "category not found" },
                    { status: 404 },
                );
            }

            // Проверка дали slug е уникален при update
            if (!data.slug?.trim()) {
                data.slug = generateSlug(data.name);
            }

            if (data.slug !== category.slug) {
                const slugTaken = await getCategoryByColumn("slug", data.slug);

                if (slugTaken) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: "Slug вече се използва от друг град.",
                        },
                        { status: 400 },
                    );
                }
            }

            await updateCategory(categoryId, {
                name: data.name,
                slug: data.slug,
                heading: data.heading,
                parent_id: data.parentId,
                excerpt: data.excerpt,
            });

            return NextResponse.json(
                { success: true, categoryId: data.id },
                { status: 200 },
            );
        }

        /**
         * =========================
         * CREATE CITY
         * =========================
         */

        if (!data.slug || data.slug.length === 0) {
            data.slug = generateSlug(data.name);
        }

        // Проверка уникалност и автоматично правене уникален
        data.slug = await makeUniqueSlug(data.slug);

        // Проверка дали slug вече съществува
        const slugTaken = await getCategoryByColumn("slug", data.slug);

        if (slugTaken) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Slug вече се използва от друга държава.",
                },
                { status: 400 },
            );
        }

        const city = await createCategory({
            name: data.name,
            slug: data.slug,
            heading: data.heading,
            excerpt: data.excerpt,
            parent_id: data.parentId,
            id: 0,
        });

        return NextResponse.json(
            { success: true, categoryId: city.id },
            { status: 201 },
        );
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 },
        );
    }
}