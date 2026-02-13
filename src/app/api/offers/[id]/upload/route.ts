import { NextResponse } from "next/server";
import { deleteUploadedFile, saveUploadedFile } from "@/app/api/lib";
import { OfferService } from "@/lib/services/offer-service";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

const offerService = new OfferService();

export async function POST(req: Request, { params }: Params) {
    const { id } = await params;

    const formData = await req.formData();
    const file = formData.get("image") as File;

    if (!file) {
        return NextResponse.json({ error: "Няма файл" }, { status: 400 });
    }

    try {
        const url = await saveUploadedFile(file);

        const offer = await offerService.update(Number(id), {
            image: url,
        });

        return NextResponse.json({
            success: true,
            url,
            offer,
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
        // 1️⃣ Взимаме държавата с текущото image_url
        const offer = await offerService.getOfferByColumn("id", id);

        if (!offer) {
            return NextResponse.json(
                { error: "Компанията не съществува" },
                { status: 404 },
            );
        }

        // 2️⃣ Изтриваме файла от public/uploads
        if (offer.image) {
            deleteUploadedFile(offer.image);
        }

        // 3️⃣ Нулираме image_url в базата
        const offerUpdated = await offerService.update(Number(id), {
            image: null,
        });

        return NextResponse.json({ success: true, offer: offerUpdated });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: err.message || "Грешка" },
            { status: 500 },
        );
    }
}