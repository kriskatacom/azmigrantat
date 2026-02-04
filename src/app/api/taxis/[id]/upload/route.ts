import { NextResponse } from "next/server";
import { deleteUploadedFile, saveUploadedFile } from "@/app/api/lib";
import { getTaxiByColumn, updateTaxi } from "@/lib/services/taxi-service";

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

        const taxi = await updateTaxi(Number(id), {
            image_url: url,
        });

        return NextResponse.json({
            success: true,
            url,
            taxi,
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
        const taxi = await getTaxiByColumn("id", id);

        if (!taxi) {
            return NextResponse.json(
                { error: "Таксиметровата компания не съществува" },
                { status: 404 },
            );
        }

        if (taxi.image_url) {
            deleteUploadedFile(taxi.image_url);
        }

        const taxiUpdated = await updateTaxi(Number(id), {
            image_url: "",
        });

        return NextResponse.json({ success: true, taxi: taxiUpdated });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка" },
            { status: 500 },
        );
    }
}
