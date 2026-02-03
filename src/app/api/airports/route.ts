import { NextResponse } from "next/server";
import { generateSlug } from "@/app/api/lib";
import {
    createAirport,
    getAirportByColumn,
    updateAirport,
} from "@/lib/services/airports-service";
import { NewAirport } from "@/app/admin/airports/[id]/airport-form";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function makeUniqueSlug(slug: string) {
    let uniqueSlug = slug;
    let counter = 2;

    while (await getAirportByColumn("slug", uniqueSlug)) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
}

export async function POST(req: Request) {
    try {
        const data: NewAirport = await req.json();

        if (process.env.NODE_ENV === "development") {
            await delay(100);
        }

        /**
         * =========================
         * UPDATE AIRPORT
         * =========================
         */
        if (data.id) {
            const airportId = Number(data.id);

            if (isNaN(airportId)) {
                return NextResponse.json(
                    { success: false, error: "Invalid airport id" },
                    { status: 400 },
                );
            }

            const airport = await getAirportByColumn("id", airportId);

            if (!airport) {
                return NextResponse.json(
                    { success: false, error: "Airport not found" },
                    { status: 404 },
                );
            }

            // slug
            if (!data.slug?.trim()) {
                data.slug = generateSlug(data.name);
            }

            if (data.slug !== airport.slug) {
                const slugTaken = await getAirportByColumn("slug", data.slug);

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

            await updateAirport(airportId, {
                name: data.name,
                slug: data.slug,
                iata_code: data.iata_code,
                icao_code: data.icao_code,
                description: data.description,
                latitude: data.latitude,
                longitude: data.longitude,
                website_url: data.website_url,
                country_id: data.country_id as number,
            });

            return NextResponse.json(
                { success: true, airportId },
                { status: 200 },
            );
        }

        /**
         * =========================
         * CREATE AIRPORT
         * =========================
         */

        if (!data.slug || data.slug.length === 0) {
            data.slug = generateSlug(data.name);
        }

        data.slug = await makeUniqueSlug(data.slug);

        const slugTaken = await getAirportByColumn("slug", data.slug);

        if (slugTaken) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Slug вече се използва от друго летище.",
                },
                { status: 400 },
            );
        }

        const airport = await createAirport({
            name: data.name,
            slug: data.slug,
            iata_code: data.iata_code,
            icao_code: data.icao_code,
            description: data.description,
            latitude: data.latitude,
            longitude: data.longitude,
            website_url: data.website_url,
            country_id: data.country_id as number,
        });

        return NextResponse.json(
            { success: true, airportId: airport.id },
            { status: 201 },
        );
    } catch (err) {
        console.error("POST /api/airports error", err);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 },
        );
    }
}