import { NextResponse } from "next/server";
import { deleteUploadedFile } from "@/app/api/lib";
import {
    deleteLandmark,
    getLandmarkByColumn,
} from "@/lib/services/landmark-service";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function DELETE(_: Request, { params }: Params) {
    const { id } = await params;
    const landmarkId = Number(id);

    if (isNaN(landmarkId)) {
        return NextResponse.json(
            { error: "Invalid landmark id" },
            { status: 400 },
        );
    }

    try {
        const landmark = await getLandmarkByColumn("id", landmarkId);
        if (!landmark) {
            return NextResponse.json(
                { error: "landmark not found" },
                { status: 404 },
            );
        }

        if (landmark.image_url) {
            await deleteUploadedFile(landmark.image_url);
        }

        if (landmark.additional_images) {
            let additionalImages: string[] = [];

            if (typeof landmark.additional_images === "string") {
                try {
                    additionalImages = JSON.parse(landmark.additional_images);
                } catch {
                    additionalImages = [];
                }
            } else if (Array.isArray(landmark.additional_images)) {
                additionalImages = landmark.additional_images;
            }

            await Promise.all(
                additionalImages.map((url) => deleteUploadedFile(url)),
            );
        }

        await deleteLandmark(landmarkId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting landmark:", error);
        return NextResponse.json(
            { error: "Cannot delete landmark" },
            { status: 500 },
        );
    }
}
