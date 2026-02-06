import { NextResponse } from "next/server";
import { generateSlug } from "@/app/api/lib";
import {
    createMunicipality,
    CreateMunicipalityInput,
    getMunicipalities,
    getMunicipalityByColumn,
    updateMunicipality,
} from "@/lib/services/municipality-service";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function makeUniqueSlug(slug: string) {
    let uniqueSlug = slug;
    let counter = 2;

    while (await getMunicipalityByColumn("slug", uniqueSlug)) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
}

export async function POST(req: Request) {
    try {
        const data: CreateMunicipalityInput = await req.json();

        if (process.env.NODE_ENV === "development") {
            await delay(100);
        }

        /**
         * =========================
         * UPDATE MUNICIPALITY
         * =========================
         */
        if (data.id) {
            const municipalityId = Number(data.id);

            if (isNaN(municipalityId)) {
                return NextResponse.json(
                    { success: false, error: "Invalid municipality id" },
                    { status: 400 },
                );
            }

            const municipality = await getMunicipalityByColumn(
                "id",
                municipalityId,
            );

            if (!municipality) {
                return NextResponse.json(
                    { success: false, error: "municipality not found" },
                    { status: 404 },
                );
            }

            if (!data.slug?.trim()) {
                data.slug = generateSlug(data.name);
            }

            if (data.slug !== municipality.slug) {
                const slugTaken = await getMunicipalityByColumn(
                    "slug",
                    data.slug,
                );

                if (slugTaken) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: "Slug вече се използва от друг град.",
                        },
                        { status: 400 },
                    );
                }
            }

            await updateMunicipality(municipalityId, {
                name: data.name,
                slug: data.slug,
                heading: data.heading,
                country_id: data.country_id,
                city_id: data.city_id,
                excerpt: data.excerpt,
            });

            return NextResponse.json(
                { success: true, municipalityId: data.id },
                { status: 200 },
            );
        }

        /**
         * =========================
         * CREATE MUNICIPALITY
         * =========================
         */

        if (!data.slug || data.slug.length === 0) {
            data.slug = generateSlug(data.name);
        }

        data.slug = await makeUniqueSlug(data.slug);
        const slugTaken = await getMunicipalityByColumn("slug", data.slug);

        if (slugTaken) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Slug вече се използва от друга държава.",
                },
                { status: 400 },
            );
        }

        const municipality = await createMunicipality(data);

        return NextResponse.json(
            { success: true, municipalityId: municipality.id },
            { status: 201 },
        );
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 },
        );
    }
}