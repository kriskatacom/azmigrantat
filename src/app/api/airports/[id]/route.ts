import { NextResponse } from "next/server";
import { deleteUploadedFile } from "@/app/api/lib";
import { deleteAirport, getAirportByColumn } from "@/lib/services/airports-service";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function DELETE(_: Request, { params }: Params) {
    const { id } = await params;
    const airportId = Number(id);

    if (isNaN(airportId)) {
        return NextResponse.json(
            { error: "Invalid airport id" },
            { status: 400 },
        );
    }

    try {
        const airport = await getAirportByColumn("id", airportId);
        if (!airport) {
            return NextResponse.json(
                { error: "airport not found" },
                { status: 404 },
            );
        }

        if (airport.image_url) {
            await deleteUploadedFile(airport.image_url);
        }

        await deleteAirport(airportId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting airport:", error);
        return NextResponse.json(
            { error: "Cannot delete airport" },
            { status: 500 },
        );
    }
}
