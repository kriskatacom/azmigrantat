import { NextResponse } from "next/server";
import { deleteUploadedFile, saveUploadedFile } from "@/app/api/lib";
import {
    getLandmarkByColumn,
    updateLandmark,
} from "@/lib/services/landmark-service";

type Params = {
    params: Promise<{ id: string }>;
};

// POST: добавя много снимки в additionalImages
export async function POST(req: Request, { params }: Params) {
    const { id } = await params;

    const formData = await req.formData();
    const files = formData.getAll("images") as File[]; // множествени файлове

    if (!files.length) {
        return NextResponse.json(
            { error: "Няма файлове за качване" },
            { status: 400 },
        );
    }

    try {
        // Взимаме текущите additionalImages
        const landmark = await getLandmarkByColumn("id", id);

        if (!landmark) {
            return NextResponse.json(
                { error: "Посолството не съществува" },
                { status: 404 },
            );
        }

        // Преобразуваме JSON масива
        const currentImages: string[] = Array.isArray(
            landmark.additional_images,
        )
            ? (landmark.additional_images as string[]).filter(
                  (img): img is string => typeof img === "string",
              )
            : [];

        // Запазваме всеки файл и събираме URL-тата
        const uploadedUrls: string[] = [];
        for (const file of files) {
            const url = await saveUploadedFile(file);
            uploadedUrls.push(url);
        }

        // Актуализираме базата
        const updatedImages = [...currentImages, ...uploadedUrls];

        const updatedLandmark = await updateLandmark(Number(id), {
            additional_images: JSON.stringify(updatedImages),
        });

        return NextResponse.json({
            success: true,
            urls: uploadedUrls,
            landmark: updatedLandmark,
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
    const landmarkId = Number(id);

    if (isNaN(landmarkId)) {
        return NextResponse.json(
            { error: "Invalid landmark id" },
            { status: 400 },
        );
    }

    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get("imageUrl");

    if (!imageUrl) {
        return NextResponse.json(
            { error: "Липсва imageUrl за изтриване" },
            { status: 400 },
        );
    }

    try {
        const landmark = await getLandmarkByColumn("id", landmarkId);

        if (!landmark) {
            return NextResponse.json(
                { error: "Посолството не съществува" },
                { status: 404 },
            );
        }

        // Парсваме additional_images безопасно
        let additionalImages: string[] = [];

        if (Array.isArray(landmark.additional_images)) {
            additionalImages = landmark.additional_images;
        } else if (typeof landmark.additional_images === "string") {
            try {
                additionalImages = JSON.parse(landmark.additional_images);
            } catch {
                additionalImages = [];
            }
        }

        // Премахваме снимката
        const updatedImages = additionalImages.filter(
            (img) => img !== imageUrl,
        );

        // Изтриваме файла от диска
        await deleteUploadedFile(imageUrl);

        // Update в базата
        const landmarkUpdated = await updateLandmark(landmarkId, {
            additional_images: JSON.stringify(updatedImages),
        });

        return NextResponse.json({ success: true, landmark: landmarkUpdated });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка при изтриване" },
            { status: 500 },
        );
    }
}
