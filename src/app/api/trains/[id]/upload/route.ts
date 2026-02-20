import { NextResponse } from "next/server";
import { deleteUploadedFile, saveUploadedFile } from "@/app/api/lib";
import { getTrainByColumn, updateTrain } from "@/lib/services/train-service";

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
        const train = await getTrainByColumn("id", id);

        if (!train) {
            return NextResponse.json(
                { error: "Влакът не съществува" },
                { status: 404 },
            );
        }

        const customFilename = `${train.name}-${train.slug}-${id}.webp`;
        const url = await saveUploadedFile(file, true, customFilename);

        const trainUpdated = await updateTrain(Number(id), {
            image_url: url,
        });

        return NextResponse.json({
            success: true,
            url,
            train: trainUpdated,
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
        const train = await getTrainByColumn("id", id);

        if (!train) {
            return NextResponse.json(
                { error: "Държавата не съществува" },
                { status: 404 },
            );
        }

        if (train.image_url) {
            deleteUploadedFile(train.image_url);
        }

        const trainUpdated = await updateTrain(Number(id), {
            image_url: "",
        });

        return NextResponse.json({ success: true, autobus: trainUpdated });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка" },
            { status: 500 },
        );
    }
}
