import { NextResponse } from "next/server";
import { generateSlug } from "@/app/api/lib";
import { NewCountry } from "@/app/admin/countries/[id]/country-form";
import { createCountry, getCountryByColumn, updateCountry } from "@/lib/services/country-service";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function makeUniqueSlug(slug: string) {
    let uniqueSlug = slug;
    let counter = 2;

    while (await getCountryByColumn("slug", uniqueSlug)) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
}

export async function POST(req: Request) {
    try {
        const data: NewCountry = await req.json();

        if (process.env.NODE_ENV === "development") {
            await delay(100);
        }

        /**
         * =========================
         * UPDATE COUNTRY
         * =========================
         */
        if (data.id) {
            const countryId = Number(data.id);

            if (isNaN(countryId)) {
                return NextResponse.json(
                    { success: false, error: "Invalid country id" },
                    { status: 400 },
                );
            }

            const country = await getCountryByColumn("id", countryId);

            if (!country) {
                return NextResponse.json(
                    { success: false, error: "country not found" },
                    { status: 404 },
                );
            }

            // Проверка дали slug е уникален при update
            if (!data.slug?.trim()) {
                data.slug = generateSlug(data.name);
            }

            if (data.slug !== country.slug) {
                const slugTaken = await getCountryByColumn("slug", data.slug);

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

            await updateCountry(countryId, {
                name: data.name,
                slug: data.slug,
                heading: data.heading,
                excerpt: data.excerpt,
            });

            return NextResponse.json(
                { success: true, countryId: data.id },
                { status: 200 },
            );
        }

        /**
         * =========================
         * CREATE EMBASSY
         * =========================
         */

        if (!data.slug || data.slug.length === 0) {
            data.slug = generateSlug(data.name);
        }

        // Проверка уникалност и автоматично правене уникален
        data.slug = await makeUniqueSlug(data.slug);

        // Проверка дали slug вече съществува
        const slugTaken = await getCountryByColumn("slug", data.slug);

        if (slugTaken) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Slug вече се използва от друга държава.",
                },
                { status: 400 },
            );
        }

        const country = await createCountry({
            name: data.name,
            slug: data.slug,
            heading: data.heading,
            excerpt: data.excerpt,
        });

        return NextResponse.json(
            { success: true, countryId: country.id },
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
