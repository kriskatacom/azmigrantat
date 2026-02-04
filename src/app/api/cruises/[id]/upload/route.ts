import { NextResponse } from "next/server";
import { deleteUploadedFile, saveUploadedFile } from "@/app/api/lib";
import { getCruiseByColumn, updateCruise } from "@/lib/services/cruise-service";

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

        const cruise = await updateCruise(Number(id), {
            image_url: url,
        });

        return NextResponse.json({
            success: true,
            url,
            cruise,
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
        const cruise = await getCruiseByColumn("id", id);

        if (!cruise) {
            return NextResponse.json(
                { error: "Таксиметровата компания не съществува" },
                { status: 404 },
            );
        }

        if (cruise.image_url) {
            deleteUploadedFile(cruise.image_url);
        }

        const cruiseUpdated = await updateCruise(Number(id), {
            image_url: "",
        });

        return NextResponse.json({ success: true, cruise: cruiseUpdated });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка" },
            { status: 500 },
        );
    }
}
