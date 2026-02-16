import { NextResponse } from "next/server";
import { generateSlug } from "@/app/api/lib";
import {
    createAirline,
    getAirlineByColumn,
    updateAirline,
} from "@/lib/services/airline-service";
import { NewAirline } from "@/app/[locale]/admin/airlines/[id]/new-airline-form";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function makeUniqueSlug(slug: string) {
    let uniqueSlug = slug;
    let counter = 2;

    while (await getAirlineByColumn("slug", uniqueSlug)) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
}

export async function POST(req: Request) {
    try {
        const data: NewAirline = await req.json();

        if (process.env.NODE_ENV === "development") {
            await delay(100);
        }

        /**
         * =========================
         * UPDATE AIRLINE
         * =========================
         */
        if (data.id) {
            const airlineId = Number(data.id);

            if (isNaN(airlineId)) {
                return NextResponse.json(
                    { success: false, error: "Invalid airline id" },
                    { status: 400 },
                );
            }

            const airline = await getAirlineByColumn("id", airlineId);

            if (!airline) {
                return NextResponse.json(
                    { success: false, error: "Airline not found" },
                    { status: 404 },
                );
            }

            // slug
            if (!data.slug?.trim()) {
                data.slug = generateSlug(data.name);
            }

            if (data.slug !== airline.slug) {
                const slugTaken = await getAirlineByColumn("slug", data.slug);

                if (slugTaken) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: "Slug вече се използва от друго летище.",
                        },
                        { status: 400 },
                    );
                }
            }

            await updateAirline(airlineId, {
                name: data.name,
                slug: data.slug,
                website_url: data.website_url,
            });

            return NextResponse.json(
                { success: true, airlineId },
                { status: 200 },
            );
        }

        /**
         * =========================
         * CREATE AIRLINE
         * =========================
         */

        if (!data.slug || data.slug.length === 0) {
            data.slug = generateSlug(data.name);
        }

        data.slug = await makeUniqueSlug(data.slug);

        const slugTaken = await getAirlineByColumn("slug", data.slug);

        if (slugTaken) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Slug вече се използва от друго летище.",
                },
                { status: 400 },
            );
        }

        const airline = await createAirline({
            name: data.name,
            slug: data.slug,
            website_url: data.website_url,
            id: 0,
        });

        return NextResponse.json(
            { success: true, airlineId: airline.id },
            { status: 201 },
        );
    } catch (err) {
        console.error("POST /api/airlines error", err);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 },
        );
    }
}
