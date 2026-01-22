import { NextResponse } from "next/server";
import { generateSlug } from "@/app/api/lib";
import { NewEmbassy } from "@/app/admin/embassies/[id]/embassy-form";
import { createLandmark, getLandmarkByColumn, updateLandmark } from "@/lib/services/landmark-service";
import { NewLandmark } from "@/app/admin/landmarks/[id]/landmark-form";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function makeUniqueSlug(slug: string) {
    let uniqueSlug = slug;
    let counter = 2;

    while (await getLandmarkByColumn("slug", uniqueSlug)) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
}

export async function POST(req: Request) {
    try {
        const data: NewLandmark = await req.json();

        if (process.env.NODE_ENV === "development") {
            await delay(100);
        }

        /**
         * =========================
         * UPDATE LANDMARK
         * =========================
         */
        if (data.id) {
            const landmarkId = Number(data.id);

            if (isNaN(landmarkId)) {
                return NextResponse.json(
                    { success: false, error: "Invalid landmark id" },
                    { status: 400 },
                );
            }

            const landmark = await getLandmarkByColumn("id", landmarkId);

            if (!landmark) {
                return NextResponse.json(
                    { success: false, error: "landmark not found" },
                    { status: 404 },
                );
            }

            // Проверка дали slug е уникален при update
            if (!data.slug?.trim()) {
                data.slug = generateSlug(data.name);
            }

            if (data.slug !== landmark.slug) {
                const slugTaken = await getLandmarkByColumn("slug", data.slug);

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

            await updateLandmark(landmarkId, {
                name: data.name,
                slug: data.slug,
                heading: data.heading,
                excerpt: data.excerpt,
                content: data.content,
                contacts_content: data.contactsContent,
                country_id: data.countryId,
            });

            return NextResponse.json(
                { success: true, landmarkId: data.id },
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
        const slugTaken = await getLandmarkByColumn("slug", data.slug);

        if (slugTaken) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Slug вече се използва от друга държава.",
                },
                { status: 400 },
            );
        }

        const landmark = await createLandmark({
            name: data.name,
            slug: data.slug,
            heading: data.heading,
            excerpt: data.excerpt,
            content: data.content,
            contacts_content: data.contactsContent,
            country_id: data.countryId,
        });

        return NextResponse.json(
            { success: true, landmarkId: landmark.id },
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
