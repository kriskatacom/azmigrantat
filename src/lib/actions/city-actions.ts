"use server";

import { getCityByColumn, getCities } from "@/lib/services/city-service";
import { City } from "@/lib/types";

interface GetCitiesOptions {
    countryId?: number;
    citySlug?: string;
}

export async function fetchCities(
    options: GetCitiesOptions = {},
): Promise<City[] | City | null> {
    const { countryId, citySlug } = options;

    if (citySlug) {
        return await getCityByColumn("slug", citySlug);
    }

    if (countryId) {
        return await getCities({ column: "country_id", value: countryId });
    }

    return await getCities();
}
