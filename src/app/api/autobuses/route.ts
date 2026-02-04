import { NextResponse } from "next/server";
import { generateSlug } from "@/app/api/lib";
import {
    createAutobus,
    getAutobusByColumn,
    updateAutobus,
} from "@/lib/services/autobus-service";
import { NewAutobus } from "@/app/admin/autobuses/[id]/new-autobus-form";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function makeUniqueSlug(slug: string) {
    let uniqueSlug = slug;
    let counter = 2;

    while (await getAutobusByColumn("slug", uniqueSlug)) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
}

export async function POST(req: Request) {
    try {
        const data: NewAutobus = await req.json();

        if (process.env.NODE_ENV === "development") {
            await delay(100);
        }

        /**
         * =========================
         * UPDATE AUTOBUS
         * =========================
         */
        if (data.id) {
            const autobusId = Number(data.id);

            if (isNaN(autobusId)) {
                return NextResponse.json(
                    { success: false, error: "Invalid autobus id" },
                    { status: 400 },
                );
            }

            const autobus = await getAutobusByColumn("id", autobusId);

            if (!autobus) {
                return NextResponse.json(
                    { success: false, error: "autobus not found" },
                    { status: 404 },
                );
            }

            // slug
            if (!data.slug?.trim()) {
                data.slug = generateSlug(data.name);
            }

            if (data.slug !== autobus.slug) {
                const slugTaken = await getAutobusByColumn("slug", data.slug);

                if (slugTaken) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: "Slug вече се използва от друга автобусна гара.",
                        },
                        { status: 400 },
                    );
                }
            }

            await updateAutobus(autobusId, {
                name: data.name,
                slug: data.slug,
                website_url: data.website_url,
                country_id: data.country_id,
                city_id: data.city_id,
            });

            return NextResponse.json(
                { success: true, autobusId },
                { status: 200 },
            );
        }

        /**
         * =========================
         * CREATE AUTOBUS
         * =========================
         */

        if (!data.slug || data.slug.length === 0) {
            data.slug = generateSlug(data.name);
        }

        data.slug = await makeUniqueSlug(data.slug);

        const slugTaken = await getAutobusByColumn("slug", data.slug);

        if (slugTaken) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Slug вече се използва от друга автобусна гара.",
                },
                { status: 400 },
            );
        }

        const autobus = await createAutobus({
            name: data.name,
            slug: data.slug,
            country_id: data.country_id,
            city_id: data.city_id,
            id: 0,
        });

        return NextResponse.json(
            { success: true, autobusId: autobus.id },
            { status: 201 },
        );
    } catch (err) {
        console.error("POST /api/autobuses error", err);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 },
        );
    }
}