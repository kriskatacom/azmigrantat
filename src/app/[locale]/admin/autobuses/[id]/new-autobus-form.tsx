"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FiLoader, FiSave } from "react-icons/fi";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/utils";
import { Autobus, City, Country } from "@/lib/types";
import { RelationForm } from "@/components/relation-form";

export interface NewAutobus {
    id: number | null;
    name: string;
    slug: string;
    website_url: string;
    country_id: number | null;
    city_id: number | null;
}

type Params = {
    autobus: Autobus | null;
    countries: Country[];
};

type FormErrors = Partial<Record<keyof NewAutobus, string>>;

export default function NewAutobusForm({ autobus, countries }: Params) {
    const router = useRouter();

    const [formData, setFormData] = useState<NewAutobus>({
        id: autobus?.id ?? null,
        name: autobus?.name ?? "",
        slug: autobus?.slug ?? "",
        website_url: autobus?.website_url ?? "",
        country_id: autobus?.country_id ?? null,
        city_id: autobus?.city_id ?? null,
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cities, setCities] = useState<City[]>([]);
    const [isCitiesLoading, setIsCitiesLoading] = useState(false);

    const handleChange = (field: keyof NewAutobus, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const validate = () => {
        const newErrors: FormErrors = {};

        if (!formData.name) newErrors.name = "Името е задължително";
        if (!formData.slug) newErrors.slug = "URL адресът е задължителен";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);

        try {
            const res = await axios.post("/api/autobuses", formData);

            if (res.data.success) {
                toast.success("Летището е запазено!");

                if (res.status === 201)
                    router.push(`/admin/autobuses/${res.data.autobusId}`);
                if (res.status === 200) router.push("/admin/autobuses");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Грешка при запис");
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
            className="m-5 p-5 border rounded-md space-y-10"
        >
            <div className="space-y-2">
                <Label>Име на автобусната гара *</Label>
                <Input
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                />
            </div>

            <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                    value={formData.slug}
                    onChange={(e) => handleChange("slug", e.target.value)}
                />
                {errors.slug && (
                    <div className="text-destructive">
                        Това поле е задължително!
                    </div>
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
                <div className="flex gap-5">
                    <div className="space-y-2">
                        <RelationForm
                            items={countries.map((c) => ({
                                id: c.id!,
                                label: c.name!,
                            }))}
                            value={formData.country_id as number}
                            onChange={(id) =>
                                setFormData((p) => ({
                                    ...p,
                                    country_id: id as number,
                                }))
                            }
                            placeholder="Изберете държава"
                        />
                        {errors.country_id && (
                            <div className="text-destructive">
                                Моля, изберете държава!
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-5">
                    <div className="space-y-2">
                        <RelationForm
                            items={cities.map((c) => ({
                                id: c.id!,
                                label: c.name!,
                            }))}
                            value={formData.city_id as number}
                            onChange={(id) =>
                                setFormData((p) => ({
                                    ...p,
                                    city_id: id as number,
                                }))
                            }
                            disabled={isCitiesLoading}
                            placeholder="Изберете град"
                        />
                        {errors.city_id && (
                            <div className="text-destructive">
                                Моля, изберете град!
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {formData.id && (
                <>
                    <div className="space-y-2">
                        <Label>Официален сайт</Label>
                        <Input
                            value={formData.website_url}
                            onChange={(e) =>
                                handleChange("website_url", e.target.value)
                            }
                        />
                    </div>
                </>
            )}

            <Button
                type="submit"
                variant={"outline"}
                size="lg"
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <FiLoader className="animate-spin" />
                ) : (
                    <FiSave />
                )}
                {autobus?.id ? "Записване" : "Създаване"}
            </Button>
        </form>
    );
}