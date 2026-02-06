import { NextResponse } from "next/server";
import { deleteUploadedFile } from "@/app/api/lib";
import {
    deleteMunicipality,
    getMunicipalityByColumn,
} from "@/lib/services/municipality-service";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function DELETE(_: Request, { params }: Params) {
    const { id } = await params;
    const municipalityId = Number(id);

    if (isNaN(municipalityId)) {
        return NextResponse.json(
            { error: "Invalid municipality id" },
            { status: 400 },
        );
    }

    try {
        const municipality = await getMunicipalityByColumn(
            "id",
            municipalityId,
        );
        if (!municipality) {
            return NextResponse.json(
                { error: "municipality not found" },
                { status: 404 },
            );
        }

        if (municipality.image_url) {
            await deleteUploadedFile(municipality.image_url);
        }

        await deleteMunicipality(municipalityId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting municipality:", error);
        return NextResponse.json(
            { error: "Cannot delete municipality" },
            { status: 500 },
        );
    }
}
