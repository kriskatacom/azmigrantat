"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import axios from "axios";
import { RelationForm } from "@/components/relation-form";
import { Country, City } from "@/lib/types";
import { fetchCountry } from "@/lib/actions/country-actions";
import { fetchCities } from "@/lib/actions/city-actions";

interface Props {
    countries: Country[];
}

export default function MunicipalityFilters({ countries }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [formData, setFormData] = useState<{
        country_id: number | null;
        city_id: number | null;
    }>({
        country_id: null,
        city_id: null,
    });

    const [cities, setCities] = useState<City[]>([]);
    const [isCitiesLoading, setIsCitiesLoading] = useState(false);

    useEffect(() => {
        async function syncFromUrl() {
            const countrySlug = searchParams.get("country");
            const citySlug = searchParams.get("city");

            let countryId: number | null = null;
            let cityId: number | null = null;

            if (countrySlug) {
                const localCountry = countries.find(
                    (c) => c.slug === countrySlug,
                );

                if (localCountry) {
                    countryId = localCountry.id;
                } else {
                    const serverCountry = await fetchCountry(countrySlug);
                    countryId = serverCountry?.id ?? null;
                }
            }

            if (countryId) {
                setIsCitiesLoading(true);

                const res = await axios.get(
                    `/api/cities?countryId=${countryId}`,
                );

                setCities(res.data);
                setIsCitiesLoading(false);
            } else {
                setCities([]);
            }

            if (citySlug && countryId) {
                const localCity = cities.find((c) => c.slug === citySlug);

                if (localCity) {
                    cityId = localCity.id;
                } else {
                    const serverCity = await fetchCities({
                        countryId,
                        citySlug,
                    });

                    const matchedCity = Array.isArray(serverCity)
                        ? serverCity.find((c) => c.slug === citySlug)
                        : serverCity;

                    cityId = matchedCity?.id ?? null;
                }
            }

            setFormData((prev) => {
                if (prev.country_id === countryId && prev.city_id === cityId) {
                    return prev;
                }

                return {
                    country_id: countryId,
                    city_id: cityId,
                };
            });
        }

        syncFromUrl();
    }, [searchParams, countries]);

    function updateUrl(countryId: number | null, cityId: number | null) {
        const params = new URLSearchParams();

        const countrySlug = countries.find((c) => c.id === countryId)?.slug;

        const citySlug = cities.find((c) => c.id === cityId)?.slug;

        if (countrySlug) params.set("country", countrySlug);
        if (citySlug) params.set("city", citySlug);

        router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`);
    }

    const onCountryChange = (id: number | null) => {
        updateUrl(id, null);
    };

    const onCityChange = (id: number | null) => {
        updateUrl(formData.country_id, id);
    };

    return (
        <div className="flex flex-col gap-x-5">
            <div className="flex items-center gap-x-5">
                <div className="relative">
                    <RelationForm
                        items={countries.map((c) => ({
                            id: c.id,
                            label: c.name as string,
                        }))}
                        value={formData.country_id}
                        onChange={onCountryChange}
                        placeholder="Изберете държава"
                        label={false}
                    />
                </div>

                {formData.country_id && (
                    <RelationForm
                        items={cities.map((c) => ({
                            id: c.id,
                            label: c.name as string,
                        }))}
                        value={formData.city_id}
                        onChange={onCityChange}
                        disabled={isCitiesLoading}
                        placeholder={
                            isCitiesLoading ? "Зареждане..." : "Изберете град"
                        }
                        label={false}
                    />
                )}
            </div>
        </div>
    );
}