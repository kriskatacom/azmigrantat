import { NextResponse } from "next/server";
import { deleteUploadedFile, saveUploadedFile } from "@/app/api/lib";
import {
    getCategoryByColumn,
    updateCategory,
} from "@/lib/services/category-service";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function POST(req: Request, { params }: Params) {
    const { id } = await params;

    const formData = await req.formData();
    const file = formData.get("image") as File;

    if (!file) {
        return NextResponse.json({ error: "Няма файл" }, { status: 400 });
    }

    try {
        const category = await getCategoryByColumn("id", id);

        if (!category) {
            return NextResponse.json(
                { error: "Категорията не съществува" },
                { status: 404 },
            );
        }

        const customFilename = `${category.name}-${category.slug}-${id}.webp`;
        const url = await saveUploadedFile(file, true, customFilename);

        const categoryUpdated = await updateCategory(Number(id), {
            image_url: url,
        });

        return NextResponse.json({
            success: true,
            url,
            category: categoryUpdated,
        });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка при качване" },
            { status: 400 },
        );
    }
}

export async function DELETE(req: Request, { params }: Params) {
    const { id } = await params;

    try {
        // 1️⃣ Взимаме категорията с текущото image_url
        const city = await getCategoryByColumn("id", id);

        if (!city) {
            return NextResponse.json(
                { error: "Категорията не съществува" },
                { status: 404 },
            );
        }

        // 2️⃣ Изтриваме файла от public/uploads
        if (city.image_url) {
            deleteUploadedFile(city.image_url);
        }

        // 3️⃣ Нулираме image_url в базата
        const categoryUpdated = await updateCategory(Number(id), {
            image_url: null,
        });

        return NextResponse.json({ success: true, category: categoryUpdated });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка" },
            { status: 500 },
        );
    }
}