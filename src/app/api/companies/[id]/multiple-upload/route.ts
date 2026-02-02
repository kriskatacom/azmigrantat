import { NextResponse } from "next/server";
import { deleteUploadedFile, saveUploadedFile } from "@/app/api/lib";
import { getCompanyByColumn, updateCompany } from "@/lib/services/companies-service";

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
        const company = await getCompanyByColumn("id", id);

        if (!company) {
            return NextResponse.json(
                { error: "Посолството не съществува" },
                { status: 404 },
            );
        }

        let currentImages: string[] = [];
        if (Array.isArray(company.additional_images)) {
            currentImages = company.additional_images;
        } else if (typeof company.additional_images === "string" && company.additional_images) {
            try {
                currentImages = JSON.parse(company.additional_images);
            } catch {
                currentImages = [];
            }
        }

        // Запазваме всеки файл и събираме URL-тата
        const uploadedUrls: string[] = [];
        for (const file of files) {
            const url = await saveUploadedFile(file);
            uploadedUrls.push(url);
        }

        // Актуализираме базата
        const updatedImages = [...currentImages, ...uploadedUrls];

        const updatedCompany = await updateCompany(Number(id), {
            additional_images: JSON.stringify(updatedImages),
        });

        return NextResponse.json({
            success: true,
            urls: uploadedUrls,
            landmark: updatedCompany,
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
    const companyId = Number(id);

    if (isNaN(companyId)) {
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
        const company = await getCompanyByColumn("id", companyId);

        if (!company) {
            return NextResponse.json(
                { error: "Посолството не съществува" },
                { status: 404 },
            );
        }

        // Парсваме additional_images безопасно
        let additionalImages: string[] = [];

        if (Array.isArray(company.additional_images)) {
            additionalImages = company.additional_images;
        } else if (typeof company.additional_images === "string") {
            try {
                additionalImages = JSON.parse(company.additional_images);
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
        const companyUpdated = await updateCompany(companyId, {
            additional_images: JSON.stringify(updatedImages),
        });

        return NextResponse.json({ success: true, company: companyUpdated });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка при изтриване" },
            { status: 500 },
        );
    }
}
