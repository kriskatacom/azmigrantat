import { NextResponse } from "next/server";
import { deleteUploadedFile, saveUploadedFile } from "@/app/api/lib";
import {
    getAutobusByColumn,
    updateAutobus,
} from "@/lib/services/autobus-service";

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
        const autobus = await getAutobusByColumn("id", id);

        if (!autobus) {
            return NextResponse.json(
                { error: "Автобусът не съществува" },
                { status: 404 },
            );
        }

        const customFilename = `${autobus.name}-${autobus.slug}-${id}.webp`;
        const url = await saveUploadedFile(file, true, customFilename);

        const autobusUpdated = await updateAutobus(Number(id), {
            image_url: url,
        });

        return NextResponse.json({
            success: true,
            url,
            autobus: autobusUpdated,
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
        const autobus = await getAutobusByColumn("id", id);

        if (!autobus) {
            return NextResponse.json(
                { error: "Държавата не съществува" },
                { status: 404 },
            );
        }

        // 2️⃣ Изтриваме файла от public/uploads
        if (autobus.image_url) {
            deleteUploadedFile(autobus.image_url);
        }

        // 3️⃣ Нулираме image_url в базата
        const autobusUpdated = await updateAutobus(Number(id), {
            image_url: "",
        });

        return NextResponse.json({ success: true, autobus: autobusUpdated });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка" },
            { status: 500 },
        );
    }
}