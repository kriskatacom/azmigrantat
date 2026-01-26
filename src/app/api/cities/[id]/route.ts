import { NextResponse } from "next/server";
import { deleteUploadedFile } from "@/app/api/lib";
import { deleteCity, getCityByColumn } from "@/lib/services/city-service";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function DELETE(_: Request, { params }: Params) {
    const { id } = await params;
    const cityId = Number(id);

    if (isNaN(cityId)) {
        return NextResponse.json(
            { error: "Invalid city id" },
            { status: 400 },
        );
    }

    try {
        const city = await getCityByColumn("id", cityId);
        if (!city) {
            return NextResponse.json(
                { error: "city not found" },
                { status: 404 },
            );
        }

        if (city.image_url) {
            await deleteUploadedFile(city.image_url);
        }

        await deleteCity(cityId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting city:", error);
        return NextResponse.json(
            { error: "Cannot delete city" },
            { status: 500 },
        );
    }
}
