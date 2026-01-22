import { NextResponse } from "next/server";
import { deleteUploadedFile } from "@/app/api/lib";
import { deleteCountry, getCountryByColumn } from "@/lib/services/country-service";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function DELETE(_: Request, { params }: Params) {
    const { id } = await params;
    const countryId = Number(id);

    if (isNaN(countryId)) {
        return NextResponse.json(
            { error: "Invalid country id" },
            { status: 400 },
        );
    }

    try {
        const country = await getCountryByColumn("id", countryId);
        if (!country) {
            return NextResponse.json(
                { error: "Country not found" },
                { status: 404 },
            );
        }

        if (country.image_url) {
            await deleteUploadedFile(country.image_url);
        }

        await deleteCountry(countryId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting country:", error);
        return NextResponse.json(
            { error: "Cannot delete country" },
            { status: 500 },
        );
    }
}
