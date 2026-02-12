import { NextResponse } from "next/server";
import { deleteUploadedFile, saveUploadedFile } from "@/app/api/lib";
import { AdService } from "@/lib/services/ad-service";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

const adService = new AdService();

export async function POST(req: Request, { params }: Params) {
    const { id } = await params;

    const formData = await req.formData();
    const file = formData.get("image") as File;

    if (!file) {
        return NextResponse.json({ error: "Няма файл" }, { status: 400 });
    }

    try {
        const url = await saveUploadedFile(file);

        const ad = await adService.update(Number(id), {
            image: url,
        });

        return NextResponse.json({
            success: true,
            url,
            ad,
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
        const ad = await adService.getAdsByColumn("id", id);

        if (!ad) {
            return NextResponse.json(
                { error: "Компанията не съществува" },
                { status: 404 },
            );
        }

        // 2️⃣ Изтриваме файла от public/uploads
        if (ad.image) {
            deleteUploadedFile(ad.image);
        }

        // 3️⃣ Нулираме image_url в базата
        const adUpdated = await adService.update(Number(id), {
            image: null,
        });

        return NextResponse.json({ success: true, ad: adUpdated });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка" },
            { status: 500 },
        );
    }
}