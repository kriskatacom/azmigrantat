import { NextResponse } from "next/server";
import { deleteUploadedFile } from "@/app/api/lib";
import { deleteAirline, getAirlineByColumn } from "@/lib/services/airline-service";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function DELETE(_: Request, { params }: Params) {
    const { id } = await params;
    const airlineId = Number(id);

    if (isNaN(airlineId)) {
        return NextResponse.json(
            { error: "Invalid airline id" },
            { status: 400 },
        );
    }

    try {
        const airline = await getAirlineByColumn("id", airlineId);
        if (!airline) {
            return NextResponse.json(
                { error: "airline not found" },
                { status: 404 },
            );
        }

        if (airline.image_url) {
            await deleteUploadedFile(airline.image_url);
        }

        await deleteAirline(airlineId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting airline:", error);
        return NextResponse.json(
            { error: "Cannot delete airline" },
            { status: 500 },
        );
    }
}
