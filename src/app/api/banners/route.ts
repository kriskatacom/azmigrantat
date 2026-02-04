import { NextResponse } from "next/server";
import { generateSlug } from "@/app/api/lib";
import { NewBanner } from "@/app/admin/banners/[id]/new-banner-form";
import {
    createBanner,
    getBannerByColumn,
    updateBanner,
} from "@/lib/services/banner-service";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
    try {
        const data: NewBanner = await req.json();

        if (process.env.NODE_ENV === "development") {
            await delay(100);
        }

        /**
         * =========================
         * UPDATE BANNER
         * =========================
         */
        if (data.id) {
            const bannerId = Number(data.id);

            if (isNaN(bannerId)) {
                return NextResponse.json(
                    { success: false, error: "Invalid banner id" },
                    { status: 400 },
                );
            }

            const banner = await getBannerByColumn("id", bannerId);

            if (!banner) {
                return NextResponse.json(
                    { success: false, error: "banner not found" },
                    { status: 404 },
                );
            }

            await updateBanner(bannerId, {
                name: data.name,
                description: data.description,
                link: data.link,
                height: data.height,
            });

            return NextResponse.json(
                { success: true, bannerId },
                { status: 200 },
            );
        }

        /**
         * =========================
         * CREATE BANNER
         * =========================
         */

        const banner = await createBanner({
            name: data.name,
            description: data.description,
            link: data.link,
            height: data.height,
            id: 0,
        });

        return NextResponse.json(
            { success: true, bannerId: banner.id },
            { status: 201 },
        );
    } catch (err) {
        console.error("POST /api/banners error", err);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 },
        );
    }
}