import { NextResponse } from "next/server";
import { deleteUploadedFile, saveUploadedFile } from "@/app/api/lib";
import { getCityByColumn, updateCity } from "@/lib/services/city-service";

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
        const city = await getCityByColumn("id", id);

        if (!city) {
            return NextResponse.json(
                { error: "Градът не съществува" },
                { status: 404 },
            );
        }

        const customFilename = `${city.name}-${city.slug}-${id}.webp`;
        const url = await saveUploadedFile(file, true, customFilename);

        const cityUpdated = await updateCity(Number(id), {
            image_url: url,
        });

        return NextResponse.json({
            success: true,
            url,
            city: cityUpdated,
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
        const city = await getCityByColumn("id", id);

        if (!city) {
            return NextResponse.json(
                { error: "Държавата не съществува" },
                { status: 404 },
            );
        }

        // 2️⃣ Изтриваме файла от public/uploads
        if (city.image_url) {
            deleteUploadedFile(city.image_url);
        }

        // 3️⃣ Нулираме image_url в базата
        const cityUpdated = await updateCity(Number(id), {
            image_url: null,
        });

        return NextResponse.json({ success: true, country: cityUpdated });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка" },
            { status: 500 },
        );
    }
}