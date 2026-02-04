import { NextResponse } from "next/server";
import { deleteUploadedFile } from "@/app/api/lib";
import { deleteCruise, getCruiseByColumn } from "@/lib/services/cruise-service";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function DELETE(_: Request, { params }: Params) {
    const { id } = await params;
    const cruiseId = Number(id);

    if (isNaN(cruiseId)) {
        return NextResponse.json(
            { error: "Invalid cruise id" },
            { status: 400 },
        );
    }

    try {
        const cruise = await getCruiseByColumn("id", cruiseId);
        if (!cruise) {
            return NextResponse.json(
                { error: "cruise not found" },
                { status: 404 },
            );
        }

        if (cruise.image_url) {
            await deleteUploadedFile(cruise.image_url);
        }

        await deleteCruise(cruiseId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting cruise:", error);
        return NextResponse.json(
            { error: "Cannot delete cruise" },
            { status: 500 },
        );
    }
}
