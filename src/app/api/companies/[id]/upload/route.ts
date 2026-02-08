import { NextResponse } from "next/server";
import { deleteUploadedFile, saveUploadedFile } from "@/app/api/lib";
import {
    getCompanyByColumn,
    updateCompany,
} from "@/lib/services/companies-service";
import { ImageField } from "@/app/[locale]/admin/companies/[id]/page";

type PostParams = {
    params: Promise<{
        id: string;
    }>;
};

export async function POST(req: Request, { params }: PostParams) {
    const { id } = await params;

    const formData = await req.formData();
    const file = formData.get("image") as File;
    const imageToUpdate = formData.get("image_to_update") as ImageField;

    if (!file) {
        return NextResponse.json({ error: "Няма файл" }, { status: 400 });
    }

    try {
        const url = await saveUploadedFile(file);

        const company = await updateCompany(Number(id), {
            [imageToUpdate]: url,
        });

        return NextResponse.json({
            success: true,
            url,
            company,
        });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка при качване" },
            { status: 400 },
        );
    }
}

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function DELETE(req: Request, { params }: Params) {
    const { id } = await params;

    const { image_to_update } = (await req.json()) as {
        image_to_update: ImageField;
    };

    if (!image_to_update) {
        throw new Error("Няма подаден image_to_update");
    }

    try {
        const company = await getCompanyByColumn("id", id);

        if (!company) {
            return NextResponse.json(
                { error: "Компанията не съществува" },
                { status: 404 },
            );
        }

        if (company[image_to_update]) {
            deleteUploadedFile(company[image_to_update]);
        }

        const companyUpdated = await updateCompany(Number(id), {
            [image_to_update]: "",
        });

        return NextResponse.json({ success: true, country: companyUpdated });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка" },
            { status: 500 },
        );
    }
}