"use server";

import { getLandmarkByColumn } from "@/lib/services/landmark-service";

export async function getLandmarkByIdAction(id: number) {
    try {
        if (!id) {
            return { error: "Невалидно ID" };
        }

        const landmark = await getLandmarkByColumn("id", id);

        if (!landmark) {
            return { error: "Обектът не е намерен" };
        }

        return { data: landmark };
    } catch (error) {
        console.error("[GET_LANDMARK_ERROR]", error);
        return { error: "Възникна грешка при извличане на данните" };
    }
}