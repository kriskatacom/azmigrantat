"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FiLoader, FiSave } from "react-icons/fi";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { City, Country, Municipaliy } from "@/lib/types";
import { RelationForm } from "@/components/relation-form";
import { CreateMunicipalityInput } from "@/lib/services/municipality-service";
import { slugify } from "@/lib/utils";

type Params = {
    municipality: Municipaliy | null;
    countries: Country[];
    cities: City[];
};

type FormErrors = Partial<Record<keyof CreateMunicipalityInput, string>>;

export default function NewMunicipaliyForm({
    municipality,
    countries,
}: Params) {
    const router = useRouter();
    const [formData, setFormData] = useState<CreateMunicipalityInput>({
        name: municipality?.name ?? "",
        slug: municipality?.slug ?? "",
        heading: municipality?.heading ?? "",
        excerpt: municipality?.excerpt ?? "",
        country_id: municipality?.country_id ?? null,
        city_id: municipality?.city_id ?? null,
        id: municipality?.id ?? null,
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cities, setCities] = useState<City[]>([]);
    const [isCitiesLoading, setIsCitiesLoading] = useState(false);

    const handleChange = (
        field: keyof CreateMunicipalityInput,
        value: string,
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setIsSubmitting(true);

        try {
            const res = await axios.post("/api/municipalities", formData);

            if (res.data.success) {
                toast.success("Промените са запазени!");

                if (res.status === 201)
                    router.push(`/admin/municipalities/${res.data.municipalityId}`);
                if (res.status === 200) router.push("/admin/municipalities");
            } else {
                alert(res.data.error || "Възникна грешка");
            }
        } catch (err: any) {
            if (err.response) {
                if (
                    err.response.status === 400 &&
                    err.response.data.code === "slug"
                ) {
                    setErrors({ slug: err.response.data.error });
                } else {
                    alert(err.response.data.error || "Грешка при изпращане");
                }
            } else {
                console.error(err);
                alert("Грешка при изпращане");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!formData.country_id) {
            setCities([]);
            setFormData((prev) => ({ ...prev, cityId: null }));
            return;
        }

        setIsCitiesLoading(true);

        const fetchCities = async () => {
            try {
                const res = await axios.get(
                    `/api/cities?countryId=${formData.country_id}`,
                );

                setCities(res.data);
            } catch (error) {
                console.error(error);
                toast.error("Грешка при зареждане на градовете");
                setCities([]);
            } finally {
                setIsCitiesLoading(false);
            }
        };

        fetchCities();
    }, [formData.country_id]);

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-background m-5 p-5 border rounded-md space-y-10"
        >
            <div>
                <Label className="mb-1" htmlFor="name">
                    Име на община *
                </Label>
                <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Въведете името на общината"
                    disabled={isSubmitting}
                />
                {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label className="mb-1" htmlFor="slug">
                    URL Адрес
                </Label>
                <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleChange("slug", e.target.value)}
                    placeholder="Въведете URL адрес на града"
                    disabled={isSubmitting}
                />
                {errors.slug && (
                    <p className="text-sm text-red-500 mt-1">{errors.slug}</p>
                )}
                <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                        setFormData((prev) => ({
                            ...prev,
                            slug: slugify(prev.name),
                        }))
                    }
                >
                    Генериране
                </Button>
            </div>

            <div className="flex items-center gap-5">
                <RelationForm
                    items={countries
                        .filter(
                            (country) =>
                                country.id !== undefined &&
                                country.name !== undefined,
                        )
                        .map((country) => ({
                            id: country.id as number,
                            label: country.name as string,
                        }))}
                    value={formData.country_id ?? null}
                    onChange={(id) =>
                        setFormData((prev) => ({
                            ...prev,
                            country_id: id as number,
                        }))
                    }
                    placeholder="Изберете държава"
                    searchPlaceholder="Търсене на държава"
                    emptyText="Няма намерени държави"
                />

                {formData.country_id && (
                    <RelationForm
                        items={cities.map((city) => ({
                            id: city.id ?? "",
                            label: city.name ?? "",
                        }))}
                        value={formData.city_id ?? null}
                        onChange={(id) =>
                            setFormData((prev) => ({
                                ...prev,
                                city_id: id as number,
                            }))
                        }
                        disabled={isCitiesLoading || !formData.country_id}
                        placeholder={
                            isCitiesLoading
                                ? "Зареждане на градове..."
                                : "Изберете град"
                        }
                        searchPlaceholder="Търсене на град"
                        emptyText="Няма намерени градове"
                    />
                )}
            </div>

            <div className="text-lg text-muted-foreground">
                Всички полета със звездичка (*) са задължителни!
            </div>

            <Button
                type="submit"
                variant="default"
                size="xl"
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <FiLoader size={30} className="animate-spin" />
                ) : (
                    <FiSave size={30} />
                )}
                <span>
                    {isSubmitting
                        ? "Записване..."
                        : !municipality?.id
                          ? "Създаване"
                          : "Записване"}
                </span>
            </Button>
        </form>
    );
}
