import { NextResponse } from "next/server";
import { deleteUploadedFile } from "@/app/api/lib";
import { deleteAutobus, getAutobusByColumn } from "@/lib/services/autobus-service";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function DELETE(_: Request, { params }: Params) {
    const { id } = await params;
    const autobusId = Number(id);

    if (isNaN(autobusId)) {
        return NextResponse.json(
            { error: "Invalid autobus id" },
            { status: 400 },
        );
    }

    try {
        const autobus = await getAutobusByColumn("id", autobusId);
        if (!autobus) {
            return NextResponse.json(
                { error: "autobus not found" },
                { status: 404 },
            );
        }

        if (autobus.image_url) {
            await deleteUploadedFile(autobus.image_url);
        }

        await deleteAutobus(autobusId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting autobus:", error);
        return NextResponse.json(
            { error: "Cannot delete autobus" },
            { status: 500 },
        );
    }
}
