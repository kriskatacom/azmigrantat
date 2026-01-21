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

export async function DELETE(
    _: Request, { params }: Params,
) {
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

        if (embassy.additional_images) {
            let additionalImages: string[] = [];

            if (typeof embassy.additional_images === "string") {
                try {
                    additionalImages = JSON.parse(embassy.additional_images);
                } catch {
                    additionalImages = [];
                }
            } else if (Array.isArray(embassy.additional_images)) {
                additionalImages = embassy.additional_images;
            }

            await Promise.all(
                additionalImages.map((url) => deleteUploadedFile(url)),
            );
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
