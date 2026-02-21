"use server";

import { getCountryByColumn } from "@/lib/services/country-service";
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

        const country = await getCountryByColumn("id", embassy.country_id!);

        return { embassy, country };
    } catch (error) {
        console.error("[GET_EMBASSY_ERROR]", error);
        return { error: "Възникна грешка при извличане на данните" };
    }
}
