import { NextResponse } from "next/server";
import { generateSlug } from "@/app/api/lib";
import {
    createCompany,
    getCompanyByColumn,
    updateCompany,
} from "@/lib/services/companies-service";
import { CreateCompanyInput } from "@/app/[locale]/admin/companies/[id]/company-form";
import { getCities } from "@/lib/services/city-service";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function makeUniqueSlug(slug: string) {
    let uniqueSlug = slug;
    let counter = 2;

    while (await getCompanyByColumn("slug", uniqueSlug)) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
}

export async function POST(req: Request) {
    try {
        const data: CreateCompanyInput = await req.json();

        if (process.env.NODE_ENV === "development") {
            await delay(100);
        }

        /**
         * =========================
         * UPDATE COMPANY
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

            const city = await getCompanyByColumn("id", cityId);

            if (!city) {
                return NextResponse.json(
                    { success: false, error: "city not found" },
                    { status: 404 },
                );
            }

            if (!data.slug?.trim()) {
                data.slug = generateSlug(data.name);
            }

            if (data.slug !== city.slug) {
                const slugTaken = await getCompanyByColumn("slug", data.slug);

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

            await updateCompany(cityId, {
                name: data.name,
                slug: data.slug,
                excerpt: data.excerpt,
                description: data.description,
                company_slogan: data.company_slogan,
                google_map: data.google_map,
                your_location: data.your_location,
                contacts_content: data.contacts_content,
                country_id: data.country_id,
                city_id: data.city_id,
                category_id: data.category_id,
            });

            return NextResponse.json(
                { success: true, cityId: data.id },
                { status: 200 },
            );
        }

        /**
         * =========================
         * CREATE COMPANY
         * =========================
         */

        if (!data.slug || data.slug.length === 0) {
            data.slug = generateSlug(data.name);
        }

        // Проверка уникалност и автоматично правене уникален
        data.slug = await makeUniqueSlug(data.slug);

        // Проверка дали slug вече съществува
        const slugTaken = await getCompanyByColumn("slug", data.slug);

        if (slugTaken) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Slug вече се използва от друга държава.",
                },
                { status: 400 },
            );
        }

        const company = await createCompany(data);

        return NextResponse.json(
            { success: true, cityId: company.id },
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

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const countryId = searchParams.get("countryId");

        if (!countryId) {
            return NextResponse.json(
                { error: "countryId is required" },
                { status: 400 },
            );
        }

        const parsedCountryId = Number(countryId);

        if (Number.isNaN(parsedCountryId)) {
            return NextResponse.json(
                { error: "countryId must be a number" },
                { status: 400 },
            );
        }

        const cities = await getCities({
            column: "country_id",
            value: parsedCountryId,
        });

        return NextResponse.json(cities);
    } catch (error) {
        console.error("GET /api/cities error", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}