import { NextResponse } from "next/server";
import { deleteUploadedFile } from "@/app/api/lib";
import {
    deleteEmbassy,
    getEmbassyByColumn,
} from "@/lib/services/embassy-service";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function DELETE(_: Request, { params }: Params) {
    const { id } = await params;
    const embassyId = Number(id);

    if (isNaN(embassyId)) {
        return NextResponse.json(
            { error: "Invalid embassy id" },
            { status: 400 },
        );
    }

    try {
        const embassy = await getEmbassyByColumn("id", embassyId);
        if (!embassy) {
            return NextResponse.json(
                { error: "Embassy not found" },
                { status: 404 },
            );
        }

        if (embassy.image_url) {
            await deleteUploadedFile(embassy.image_url);
        }

        await deleteEmbassy(embassyId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting embassy:", error);
        return NextResponse.json(
            { error: "Cannot delete embassy" },
            { status: 500 },
        );
    }
}
