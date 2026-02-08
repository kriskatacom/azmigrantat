import { NextResponse } from "next/server";
import { deleteUploadedFile, saveUploadedFile } from "@/app/api/lib";
import { getLandmarkByColumn, updateLandmark } from "@/lib/services/landmark-service";

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

        const embassy = await updateLandmark(Number(id), {
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
        // 1️⃣ Взимаме държавата с текущото image_url
        const landmark = await getLandmarkByColumn("id", id);

        if (!landmark) {
            return NextResponse.json(
                { error: "Компанията не съществува" },
                { status: 404 },
            );
        }

        // 2️⃣ Изтриваме файла от public/uploads
        if (landmark.image_url) {
            deleteUploadedFile(landmark.image_url);
        }

        // 3️⃣ Нулираме image_url в базата
        const landmarkUpdated = await updateLandmark(Number(id), {
            image_url: null,
        });

        return NextResponse.json({ success: true, embassy: landmarkUpdated });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка" },
            { status: 500 },
        );
    }
}