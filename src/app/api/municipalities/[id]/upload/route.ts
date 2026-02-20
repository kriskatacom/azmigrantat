import { NextResponse } from "next/server";
import { deleteUploadedFile, saveUploadedFile } from "@/app/api/lib";
import {
    getMunicipalityByColumn,
    updateMunicipality,
} from "@/lib/services/municipality-service";

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
        const municipality = await getMunicipalityByColumn("id", id);

        if (!municipality) {
            return NextResponse.json(
                { error: "Общината не съществува" },
                { status: 404 },
            );
        }

        const customFilename = `${municipality.name}-${municipality.slug}-${id}.webp`;
        const url = await saveUploadedFile(file, true, customFilename);

        const municipalityUpdated = await updateMunicipality(Number(id), {
            image_url: url,
        });

        return NextResponse.json({
            success: true,
            url,
            municipality: municipalityUpdated,
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
        const municipality = await getMunicipalityByColumn("id", id);

        if (!municipality) {
            return NextResponse.json(
                { error: "Държавата не съществува" },
                { status: 404 },
            );
        }

        if (municipality.image_url) {
            deleteUploadedFile(municipality.image_url);
        }

        const municipalityUpdated = await updateMunicipality(Number(id), {
            image_url: null,
        });

        return NextResponse.json({
            success: true,
            municipality: municipalityUpdated,
        });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка" },
            { status: 500 },
        );
    }
}