import { NextResponse } from "next/server";
import { generateSlug } from "@/app/api/lib";
import {
    createTaxi,
    getTaxiByColumn,
    updateTaxi,
} from "@/lib/services/taxi-service";
import { NewTaxi } from "@/app/[locale]/admin/taxis/[id]/new-taxi-form";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function makeUniqueSlug(slug: string) {
    let uniqueSlug = slug;
    let counter = 2;

    while (await getTaxiByColumn("slug", uniqueSlug)) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
}

export async function POST(req: Request) {
    try {
        const data: NewTaxi = await req.json();

        if (process.env.NODE_ENV === "development") {
            await delay(100);
        }

        /**
         * =========================
         * UPDATE TAXI
         * =========================
         */
        if (data.id) {
            const taxiId = Number(data.id);

            if (isNaN(taxiId)) {
                return NextResponse.json(
                    { success: false, error: "Invalid taxi id" },
                    { status: 400 },
                );
            }

            const taxi = await getTaxiByColumn("id", taxiId);

            if (!taxi) {
                return NextResponse.json(
                    { success: false, error: "taxi not found" },
                    { status: 404 },
                );
            }

            // slug
            if (!data.slug?.trim()) {
                data.slug = generateSlug(data.name);
            }

            if (data.slug !== taxi.slug) {
                const slugTaken = await getTaxiByColumn("slug", data.slug);

                if (slugTaken) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: "Slug вече се използва от друга железопътна гара.",
                        },
                        { status: 400 },
                    );
                }
            }

            await updateTaxi(taxiId, {
                name: data.name,
                slug: data.slug,
                website_url: data.website_url,
                country_id: data.country_id,
                city_id: data.city_id,
            });

            return NextResponse.json(
                { success: true, taxiId },
                { status: 200 },
            );
        }

        /**
         * =========================
         * CREATE TAXI
         * =========================
         */

        if (!data.slug || data.slug.length === 0) {
            data.slug = generateSlug(data.name);
        }

        data.slug = await makeUniqueSlug(data.slug);

        const slugTaken = await getTaxiByColumn("slug", data.slug);

        if (slugTaken) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Slug вече се използва от друга железопътна гара.",
                },
                { status: 400 },
            );
        }

        const taxi = await createTaxi({
            name: data.name,
            slug: data.slug,
            country_id: data.country_id,
            city_id: data.city_id,
            id: 0,
        });

        return NextResponse.json(
            { success: true, taxiId: taxi.id },
            { status: 201 },
        );
    } catch (err) {
        console.error("POST /api/taxis error", err);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 },
        );
    }
}