import { NextResponse } from "next/server";
import { generateSlug } from "@/app/api/lib";
import { NewTrain } from "@/app/admin/trains/[id]/new-train-form";
import {
    createTrain,
    getTrainByColumn,
    updateTrain,
} from "@/lib/services/train-service";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function makeUniqueSlug(slug: string) {
    let uniqueSlug = slug;
    let counter = 2;

    while (await getTrainByColumn("slug", uniqueSlug)) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
}

export async function POST(req: Request) {
    try {
        const data: NewTrain = await req.json();

        if (process.env.NODE_ENV === "development") {
            await delay(100);
        }

        /**
         * =========================
         * UPDATE TRAIN
         * =========================
         */
        if (data.id) {
            const trainId = Number(data.id);

            if (isNaN(trainId)) {
                return NextResponse.json(
                    { success: false, error: "Invalid train id" },
                    { status: 400 },
                );
            }

            const train = await getTrainByColumn("id", trainId);

            if (!train) {
                return NextResponse.json(
                    { success: false, error: "train not found" },
                    { status: 404 },
                );
            }

            // slug
            if (!data.slug?.trim()) {
                data.slug = generateSlug(data.name);
            }

            if (data.slug !== train.slug) {
                const slugTaken = await getTrainByColumn("slug", data.slug);

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

            await updateTrain(trainId, {
                name: data.name,
                slug: data.slug,
                website_url: data.website_url,
                country_id: data.country_id,
                city_id: data.city_id,
            });

            return NextResponse.json(
                { success: true, trainId },
                { status: 200 },
            );
        }

        /**
         * =========================
         * CREATE TRAIN
         * =========================
         */

        if (!data.slug || data.slug.length === 0) {
            data.slug = generateSlug(data.name);
        }

        data.slug = await makeUniqueSlug(data.slug);

        const slugTaken = await getTrainByColumn("slug", data.slug);

        if (slugTaken) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Slug вече се използва от друга железопътна гара.",
                },
                { status: 400 },
            );
        }

        const autobus = await createTrain({
            name: data.name,
            slug: data.slug,
            country_id: data.country_id,
            city_id: data.city_id,
            id: 0,
        });

        return NextResponse.json(
            { success: true, trainId: autobus.id },
            { status: 201 },
        );
    } catch (err) {
        console.error("POST /api/trains error", err);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 },
        );
    }
}