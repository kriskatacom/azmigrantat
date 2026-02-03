import { NextResponse } from "next/server";
import { deleteUploadedFile, saveUploadedFile } from "@/app/api/lib";
import { getAirlineByColumn, updateAirline } from "@/lib/services/airline-service";

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

        const airline = await updateAirline(Number(id), {
            image_url: url,
        });

        return NextResponse.json({
            success: true,
            url,
            airline,
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
        const airline = await getAirlineByColumn("id", id);

        if (!airline) {
            return NextResponse.json(
                { error: "Държавата не съществува" },
                { status: 404 },
            );
        }

        // 2️⃣ Изтриваме файла от public/uploads
        if (airline.image_url) {
            deleteUploadedFile(airline.image_url);
        }

        // 3️⃣ Нулираме imageUrl в базата
        const airlineUpdated = await updateAirline(Number(id), {
            image_url: "",
        });

        return NextResponse.json({ success: true, country: airlineUpdated });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка" },
            { status: 500 },
        );
    }
}