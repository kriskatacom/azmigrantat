import { NextResponse } from "next/server";
import { deleteUploadedFile } from "@/app/api/lib";
import { deleteCategory, getCategoryByColumn } from "@/lib/services/category-service";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function DELETE(_: Request, { params }: Params) {
    const { id } = await params;
    const categoryId = Number(id);

    if (isNaN(categoryId)) {
        return NextResponse.json(
            { error: "Invalid category id" },
            { status: 400 },
        );
    }

    try {
        const category = await getCategoryByColumn("id", categoryId);
        if (!category) {
            return NextResponse.json(
                { error: "category not found" },
                { status: 404 },
            );
        }

        if (category.image_url) {
            await deleteUploadedFile(category.image_url);
        }

        await deleteCategory(categoryId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting category:", error);
        return NextResponse.json(
            { error: "Cannot delete category" },
            { status: 500 },
        );
    }
}
