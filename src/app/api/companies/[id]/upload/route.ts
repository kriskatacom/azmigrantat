import { NextResponse } from "next/server";
import { deleteUploadedFile, saveUploadedFile } from "@/app/api/lib";
import { getCompanyByColumn, updateCompany } from "@/lib/services/companies-service";

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
        const url = await saveUploadedFile(file);

        const company = await updateCompany(Number(id), {
            image_url: url,
        });

        return NextResponse.json({
            success: true,
            url,
            company,
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
        // 1️⃣ Взимаме държавата с текущото imageUrl
        const company = await getCompanyByColumn("id", id);

        if (!company) {
            return NextResponse.json(
                { error: "Държавата не съществува" },
                { status: 404 },
            );
        }

        // 2️⃣ Изтриваме файла от public/uploads
        if (company.image_url) {
            deleteUploadedFile(company.image_url);
        }

        // 3️⃣ Нулираме imageUrl в базата
        const companyUpdated = await updateCompany(Number(id), {
            image_url: "",
        });

        return NextResponse.json({ success: true, country: companyUpdated });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка" },
            { status: 500 },
        );
    }
}