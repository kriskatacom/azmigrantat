"use server";

import { revalidatePath } from "next/cache";
import { DriverSchemaInput } from "@/app/[locale]/travel/shared-travel/[driver]/administration/_tabs/general";
import { DriverPostSchemaInput } from "@/app/[locale]/travel/shared-travel/[driver]/administration/_tabs/post";
import { getDriverByColumn, updateDriver } from "@/lib/services/driver-service";
import { ContactsSchemaInput } from "@/app/[locale]/travel/shared-travel/[driver]/administration/_tabs/contacts";

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

export const updateDriverPostAction = async (
    driverId: number,
    data: DriverPostSchemaInput,
) => {
    const driver = await getDriverByColumn("id", driverId);

    if (!driver) {
        return { success: false, message: "Това шофьор не е намерен." };
    }

    await updateDriver(driverId, data);

    revalidatePath("/travel/shared-travel");

    return { success: true };
};

export const updateDriverContactsAction = async (
    driverId: number,
    data: ContactsSchemaInput,
) => {
    const driver = await getDriverByColumn("id", driverId);

    if (!driver) {
        return { success: false, message: "Този шофьор не е намерен." };
    }

    await updateDriver(driverId, {
        contact_methods: JSON.stringify(data.contact_methods),
    });

    revalidatePath("/travel/shared-travel");

    return { success: true };
};