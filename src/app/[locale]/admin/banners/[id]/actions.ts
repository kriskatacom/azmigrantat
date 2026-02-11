"use server";

import {
    bannerSchema,
    BannerInput,
} from "@/app/[locale]/admin/banners/[id]/schema";
import { createBanner, updateBanner } from "@/lib/services/banner-service";

interface BannerActionResult {
    success?: boolean;
    banner?: any;
    error?: string;
    fieldErrors?: Record<string, string[]>;
}

export async function saveBannerAction(
    data: BannerInput & { id?: number },
): Promise<BannerActionResult> {
    const parsed = bannerSchema.safeParse(data);

    if (!parsed.success) {
        return {
            error: "Невалидни данни",
            fieldErrors: parsed.error.flatten().fieldErrors,
        };
    }

    try {
        let banner;

        if (data.id) {
            banner = await updateBanner(data.id, parsed.data);
        } else {
            banner = await createBanner(parsed.data);
        }

        return {
            success: true,
            banner,
        };
    } catch (error) {
        console.error("Save banner error:", error);

        return {
            error: data.id
                ? "Възникна грешка при обновяване на банера"
                : "Възникна грешка при създаване на банера",
        };
    }
}