import { NextResponse } from "next/server";
import { deleteCompaniesBulk } from "@/lib/services/companies-service";

export async function POST(req: Request) {
    try {
        const { ids }: { ids?: Array<number> } = await req.json();

        if (!ids || ids.length === 0) {
            return NextResponse.json(
                { message: "No ids provided" },
                { status: 400 }
            );
        }

        const deletedCount = await deleteCompaniesBulk(ids);

        return NextResponse.json({ success: true, deletedCount: deletedCount });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}