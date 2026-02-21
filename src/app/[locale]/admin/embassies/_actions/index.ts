"use server";

import { getEmbassyByColumn } from "@/lib/services/embassy-service";

export async function getEmbassyByIdAction(id: number) {
    try {
        if (!id) {
            return { error: "Невалидно ID" };
        }

        const embassy = await getEmbassyByColumn("id", id);

        if (!embassy) {
            return { error: "Обектът не е намерен" };
        }

        return { data: embassy };
    } catch (error) {
        console.error("[GET_EMBASSY_ERROR]", error);
        return { error: "Възникна грешка при извличане на данните" };
    }
}