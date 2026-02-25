import { NextResponse } from "next/server";
import { deleteUploadedFile, saveUploadedFile } from "@/app/api/lib";
import { getDriverByColumn, updateDriver } from "@/lib/services/driver-service";

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
        const driver = await getDriverByColumn("id", id);

        if (!driver) {
            return NextResponse.json(
                { error: "Шофьорът не съществува" },
                { status: 404 },
            );
        }

        const customFilename = `${driver.name}-${driver.slug}-${id}.webp`;
        const url = await saveUploadedFile(file, true, customFilename);

        const driverUpdated = await updateDriver(Number(id), {
            profile_image_url: url
        });

        return NextResponse.json({
            success: true,
            url,
            driver: driverUpdated,
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
        // 1️⃣ Взимаме държавата с текущото image_url
        const driver = await getDriverByColumn("id", id);

        if (!driver) {
            return NextResponse.json(
                { error: "Държавата не съществува" },
                { status: 404 },
            );
        }

        // 2️⃣ Изтриваме файла от public/uploads
        if (driver.profile_image_url) {
            deleteUploadedFile(driver.profile_image_url);
        }

        // 3️⃣ Нулираме image_url в базата
        const driverUpdated = await updateDriver(Number(id), {
            profile_image_url: null,
        });

        return NextResponse.json({ success: true, driver: driverUpdated });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка" },
            { status: 500 },
        );
    }
}