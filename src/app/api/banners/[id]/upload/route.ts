import { NextResponse } from "next/server";
import { deleteUploadedFile, saveUploadedFile } from "@/app/api/lib";
import { getBannerByColumn, updateBanner } from "@/lib/services/banner-service";

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

        const cruise = await updateBanner(Number(id), {
            image: url,
        });

        return NextResponse.json({
            success: true,
            url,
            cruise,
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
        const banner = await getBannerByColumn("id", id);

        if (!banner) {
            return NextResponse.json(
                { error: "Таксиметровата компания не съществува" },
                { status: 404 },
            );
        }

        if (banner.image) {
            deleteUploadedFile(banner.image);
        }

        const bannerUpdated = await updateBanner(Number(id), {
            image: "",
        });

        return NextResponse.json({ success: true, banner: bannerUpdated });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка" },
            { status: 500 },
        );
    }
}
