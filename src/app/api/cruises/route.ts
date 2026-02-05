import { NextResponse } from "next/server";
import { generateSlug } from "@/app/api/lib";
import {
    createCruise,
    getCruiseByColumn,
    updateCruise,
} from "@/lib/services/cruise-service";
import { NewCruise } from "@/app/[locale]/admin/cruises/[id]/new-cruise-form";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function makeUniqueSlug(slug: string) {
    let uniqueSlug = slug;
    let counter = 2;

    while (await getCruiseByColumn("slug", uniqueSlug)) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
}

export async function POST(req: Request) {
    try {
        const data: NewCruise = await req.json();

        if (process.env.NODE_ENV === "development") {
            await delay(100);
        }

        /**
         * =========================
         * UPDATE CRUISE
         * =========================
         */
        if (data.id) {
            const cruiseId = Number(data.id);

            if (isNaN(cruiseId)) {
                return NextResponse.json(
                    { success: false, error: "Invalid cruise id" },
                    { status: 400 },
                );
            }

            const cruise = await getCruiseByColumn("id", cruiseId);

            if (!cruise) {
                return NextResponse.json(
                    { success: false, error: "cruise not found" },
                    { status: 404 },
                );
            }

            // slug
            if (!data.slug?.trim()) {
                data.slug = generateSlug(data.name);
            }

            if (data.slug !== cruise.slug) {
                const slugTaken = await getCruiseByColumn("slug", data.slug);

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

            await updateCruise(cruiseId, {
                name: data.name,
                slug: data.slug,
                website_url: data.website_url,
            });

            return NextResponse.json(
                { success: true, cruiseId },
                { status: 200 },
            );
        }

        /**
         * =========================
         * CREATE CRUISE
         * =========================
         */

        if (!data.slug || data.slug.length === 0) {
            data.slug = generateSlug(data.name);
        }

        data.slug = await makeUniqueSlug(data.slug);

        const slugTaken = await getCruiseByColumn("slug", data.slug);

        if (slugTaken) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Slug вече се използва от друга круизна компания.",
                },
                { status: 400 },
            );
        }

        const cruise = await createCruise({
            name: data.name,
            slug: data.slug,
            id: 0,
        });

        return NextResponse.json(
            { success: true, cruiseId: cruise.id },
            { status: 201 },
        );
    } catch (err) {
        console.error("POST /api/cruises error", err);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 },
        );
    }
}
