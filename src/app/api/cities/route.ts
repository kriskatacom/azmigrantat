import { NextResponse } from "next/server";
import { generateSlug } from "@/app/api/lib";
import {
    createCity,
    getCityByColumn,
    updateCity,
} from "@/lib/services/city-service";
import { NewCity } from "@/app/admin/cities/[id]/city-form";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function makeUniqueSlug(slug: string) {
    let uniqueSlug = slug;
    let counter = 2;

    while (await getCityByColumn("slug", uniqueSlug)) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
}

export async function POST(req: Request) {
    try {
        const data: NewCity = await req.json();

        if (process.env.NODE_ENV === "development") {
            await delay(100);
        }

        /**
         * =========================
         * UPDATE CITY
         * =========================
         */
        if (data.id) {
            const cityId = Number(data.id);

            if (isNaN(cityId)) {
                return NextResponse.json(
                    { success: false, error: "Invalid city id" },
                    { status: 400 },
                );
            }

            const city = await getCityByColumn("id", cityId);

            if (!city) {
                return NextResponse.json(
                    { success: false, error: "city not found" },
                    { status: 404 },
                );
            }

            // Проверка дали slug е уникален при update
            if (!data.slug?.trim()) {
                data.slug = generateSlug(data.name);
            }

            if (data.slug !== city.slug) {
                const slugTaken = await getCityByColumn("slug", data.slug);

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

            await updateCity(cityId, {
                name: data.name,
                slug: data.slug,
                heading: data.heading,
                country_id: data.countryId,
                excerpt: data.excerpt,
            });

            return NextResponse.json(
                { success: true, cityId: data.id },
                { status: 200 },
            );
        }

        /**
         * =========================
         * CREATE CITY
         * =========================
         */

        if (!data.slug || data.slug.length === 0) {
            data.slug = generateSlug(data.name);
        }

        // Проверка уникалност и автоматично правене уникален
        data.slug = await makeUniqueSlug(data.slug);

        // Проверка дали slug вече съществува
        const slugTaken = await getCityByColumn("slug", data.slug);

        if (slugTaken) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Slug вече се използва от друга държава.",
                },
                { status: 400 },
            );
        }

        const city = await createCity({
            name: data.name,
            slug: data.slug,
            heading: data.heading,
            excerpt: data.excerpt,
            country_id: data.countryId,
        });

        return NextResponse.json(
            { success: true, cityId: city.id },
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