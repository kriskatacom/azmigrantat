import { NextResponse } from "next/server";
import { deleteUploadedFile } from "@/app/api/lib";
import { deleteTrain, getTrainByColumn } from "@/lib/services/train-service";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function DELETE(_: Request, { params }: Params) {
    const { id } = await params;
    const trainId = Number(id);

    if (isNaN(trainId)) {
        return NextResponse.json(
            { error: "Invalid train id" },
            { status: 400 },
        );
    }

    try {
        const train = await getTrainByColumn("id", trainId);
        if (!train) {
            return NextResponse.json(
                { error: "train not found" },
                { status: 404 },
            );
        }

        if (train.image_url) {
            await deleteUploadedFile(train.image_url);
        }

        await deleteTrain(trainId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting train:", error);
        return NextResponse.json(
            { error: "Cannot delete train" },
            { status: 500 },
        );
    }
}
