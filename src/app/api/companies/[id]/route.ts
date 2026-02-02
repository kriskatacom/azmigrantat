import { NextResponse } from "next/server";
import { deleteUploadedFile } from "@/app/api/lib";
import { deleteCompany, getCompanyByColumn } from "@/lib/services/companies-service";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function DELETE(_: Request, { params }: Params) {
    const { id } = await params;
    const companyId = Number(id);

    if (isNaN(companyId)) {
        return NextResponse.json(
            { error: "Invalid company id" },
            { status: 400 },
        );
    }

    try {
        const company = await getCompanyByColumn("id", companyId);
        if (!company) {
            return NextResponse.json(
                { error: "company not found" },
                { status: 404 },
            );
        }

        if (company.image_url) {
            await deleteUploadedFile(company.image_url);
        }

        await deleteCompany(companyId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting city:", error);
        return NextResponse.json(
            { error: "Cannot delete city" },
            { status: 500 },
        );
    }
}
