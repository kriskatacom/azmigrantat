import { NextResponse } from "next/server";
import { deleteUploadedFile } from "@/app/api/lib";
import { deleteBanner, getBannerByColumn } from "@/lib/services/banner-service";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function DELETE(_: Request, { params }: Params) {
    const { id } = await params;
    const bannerId = Number(id);

    if (isNaN(bannerId)) {
        return NextResponse.json(
            { error: "Invalid banner id" },
            { status: 400 },
        );
    }

    try {
        const banner = await getBannerByColumn("id", bannerId);
        if (!banner) {
            return NextResponse.json(
                { error: "banner not found" },
                { status: 404 },
            );
        }

        if (banner.image) {
            await deleteUploadedFile(banner.image);
        }

        await deleteBanner(bannerId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting banner:", error);
        return NextResponse.json(
            { error: "Cannot delete banner" },
            { status: 500 },
        );
    }
}
