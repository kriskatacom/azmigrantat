import { deleteTrainsBulk } from "@/lib/services/train-service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { ids }: { ids?: Array<number> } = await req.json();

        if (!ids || ids.length === 0) {
            return NextResponse.json(
                { message: "No ids provided" },
                { status: 400 }
            );
        }

        const deletedCount = await deleteTrainsBulk(ids);

        return NextResponse.json({ success: true, deletedCount: deletedCount });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}