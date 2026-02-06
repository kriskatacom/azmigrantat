"use server";

import { getCountryByColumn } from "@/lib/services/country-service";
import { Country } from "@/lib/types";

export async function fetchCountry(
    identifier: number | string,
): Promise<Country | null> {
    if (typeof identifier === "number") {
        return await getCountryByColumn("id", identifier);
    } else {
        return await getCountryByColumn("slug", identifier);
    }
}