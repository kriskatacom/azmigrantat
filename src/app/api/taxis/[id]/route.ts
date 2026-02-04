import { NextResponse } from "next/server";
import { deleteUploadedFile } from "@/app/api/lib";
import { deleteTaxi, getTaxiByColumn } from "@/lib/services/taxi-service";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function DELETE(_: Request, { params }: Params) {
    const { id } = await params;
    const taxiId = Number(id);

    if (isNaN(taxiId)) {
        return NextResponse.json(
            { error: "Invalid taxi id" },
            { status: 400 },
        );
    }

    try {
        const taxi = await getTaxiByColumn("id", taxiId);
        if (!taxi) {
            return NextResponse.json(
                { error: "taxi not found" },
                { status: 404 },
            );
        }

        if (taxi.image_url) {
            await deleteUploadedFile(taxi.image_url);
        }

        await deleteTaxi(taxiId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting taxi:", error);
        return NextResponse.json(
            { error: "Cannot delete taxi" },
            { status: 500 },
        );
    }
}
