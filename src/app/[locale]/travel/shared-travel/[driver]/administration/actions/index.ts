"use server";

import { revalidatePath } from "next/cache";
import { DriverSchemaInput } from "@/app/[locale]/travel/shared-travel/[driver]/administration/_components/dialog-content-form";
import { getDriverByColumn, updateDriver } from "@/lib/services/driver-service";

export const updateDriverAction = async (
    driverId: number,
    data: DriverSchemaInput,
) => {
    const driver = await getDriverByColumn("id", driverId);

    if (!driver) {
        return { success: false, message: "Това шофьор не е намерен." };
    }

    await updateDriver(driverId, data);

    revalidatePath("/travel/shared-travel");

    return { success: true };
};