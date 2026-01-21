import { NextResponse } from "next/server";
import { deleteUploadedFile, saveUploadedFile } from "@/app/api/lib";
import {
    getEmbassyByColumn,
    updateEmbassy,
} from "@/lib/services/embassy-service";

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
        const url = await saveUploadedFile(file);

        const embassy = await updateEmbassy(Number(id), {
            image_url: url,
        });

        return NextResponse.json({
            success: true,
            url,
            embassy,
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
        // 1️⃣ Взимаме държавата с текущото imageUrl
        const embassy = await getEmbassyByColumn("id", id);

        if (!embassy) {
            return NextResponse.json(
                { error: "Компанията не съществува" },
                { status: 404 },
            );
        }

        // 2️⃣ Изтриваме файла от public/uploads
        if (embassy.image_url) {
            deleteUploadedFile(embassy.image_url);
        }

        // 3️⃣ Нулираме imageUrl в базата
        const embassyUpdated = await updateEmbassy(Number(id), {
            image_url: null,
        });

        return NextResponse.json({ success: true, embassy: embassyUpdated });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка" },
            { status: 500 },
        );
    }
}