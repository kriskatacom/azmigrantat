"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FiLoader, FiSave } from "react-icons/fi";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Category, City, Company, Country } from "@/lib/types";
import RichTextEditor from "@/components/rich-text-editor";
import { extractIframeSrc } from "@/lib/utils";
import { RelationForm } from "@/components/relation-form";

export interface CreateCompanyInput {
    id: number | null;
    name: string;
    slug: string;
    excerpt: string;
    description: string;
    your_location: string;
    google_map: string;
    company_slogan: string;
    contacts_content: string;
    country_id: number | null;
    city_id: number | null;
    category_id: number | null;
}

type Params = {
    company: Company | null;
    countries: Country[];
    categories: Category[];
};

type FormErrors = Partial<Record<keyof CreateCompanyInput, string>>;

export default function NewCompanyForm({
    company,
    countries,
    categories,
}: Params) {
    const router = useRouter();
    const [formData, setFormData] = useState<CreateCompanyInput>({
        id: company?.id ?? null,
        name: company?.name ?? "",
        slug: company?.slug ?? "",
        excerpt: company?.excerpt ?? "",
        description: company?.description ?? "",
        your_location: company?.your_location ?? "",
        google_map: company?.google_map ?? "",
        company_slogan: company?.company_slogan ?? "",
        contacts_content: company?.contacts_content ?? "",
        country_id: company?.country_id ?? null,
        city_id: company?.city_id ?? null,
        category_id: company?.category_id ?? null,
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cities, setCities] = useState<City[]>([]);
    const [isCitiesLoading, setIsCitiesLoading] = useState(false);

    const handleChange = (field: keyof CreateCompanyInput, value: string) => {
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
            const res = await axios.post("/api/companies", formData);

            if (res.data.success) {
                toast.success("Промените са запазени!");

                if (res.status === 201)
                    router.push(`/admin/companies/${res.data.companyId}`);
                if (res.status === 200) router.push("/admin/companies");
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

    const isValidUrl = (url: string) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    const handleGoogleMapChange = (value: string) => {
        const src = extractIframeSrc(value);

        setFormData((prev) => ({
            ...prev,
            google_map: src ?? value,
        }));
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="m-5 p-5 border rounded-md space-y-10"
        >
            <div>
                <Label className="mb-1" htmlFor="email">
                    Име на компанията *
                </Label>
                <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Въведете името на компанията"
                    disabled={isSubmitting}
                />
                {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
            </div>

            <div>
                <Label className="mb-1" htmlFor="slug">
                    URL Адрес
                </Label>
                <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleChange("slug", e.target.value)}
                    placeholder="Въведете URL адрес на компанията"
                    disabled={isSubmitting}
                />
                {errors.slug && (
                    <p className="text-sm text-red-500 mt-1">{errors.slug}</p>
                )}
            </div>

            <div className="rounded-md">
                <h2 className="text-xl font-semibold mb-5">Кратко описание</h2>
                <div className="text-editor max-w-5xl max-h-200 overflow-auto">
                    <RichTextEditor
                        content={formData.excerpt}
                        onChange={(value) =>
                            setFormData((prev) => ({
                                ...prev,
                                excerpt: value,
                            }))
                        }
                    />
                </div>
            </div>

            <div className="rounded-md">
                <h2 className="text-xl font-semibold mb-5">Описание</h2>
                <div className="text-editor max-w-5xl max-h-200 overflow-auto">
                    <RichTextEditor
                        content={formData.description}
                        onChange={(value) =>
                            setFormData((prev) => ({
                                ...prev,
                                description: value,
                            }))
                        }
                    />
                </div>
            </div>

            <div>
                <Label className="mb-1" htmlFor="company_slogan">
                    Слогън
                </Label>
                <Input
                    id="company_slogan"
                    value={formData.company_slogan}
                    onChange={(e) =>
                        handleChange("company_slogan", e.target.value)
                    }
                    placeholder="Въведете слогън на компанията"
                    disabled={isSubmitting}
                />
                {errors.company_slogan && (
                    <p className="text-sm text-red-500 mt-1">
                        {errors.company_slogan}
                    </p>
                )}
            </div>

            <div>
                <Label className="mb-1" htmlFor="google_map">
                    Google Map
                </Label>
                <Input
                    id="google_map"
                    value={formData.google_map}
                    onChange={(e) => handleGoogleMapChange(e.target.value)}
                    placeholder="Въведете URL адрес на карта от Google Map"
                    disabled={isSubmitting}
                />
                {errors.google_map && (
                    <p className="text-sm text-red-500 mt-1">
                        {errors.google_map}
                    </p>
                )}
                {formData.google_map && (
                    <div className="mt-4 w-full h-100 rounded-md overflow-hidden border">
                        <iframe
                            src={formData.google_map}
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    </div>
                )}
            </div>

            <div>
                <Label className="mb-1" htmlFor="yourLocation">
                    Вашето местонахождение
                </Label>
                <Input
                    id="your_location"
                    value={formData.your_location}
                    onChange={(e) =>
                        handleChange("your_location", e.target.value)
                    }
                    placeholder="Въведете URL адрес от Вашето местонахождение до адреса на компанията"
                    disabled={isSubmitting}
                />
                {errors.your_location && (
                    <p className="text-sm text-red-500 mt-1">
                        {errors.your_location}
                    </p>
                )}
                {formData.your_location &&
                    isValidUrl(formData.your_location) && (
                        <div className="text-lg mt-3 space-x-2">
                            <span>Вашето местоположение:</span>
                            <a
                                href={formData.your_location}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                            >
                                Упътване
                            </a>
                        </div>
                    )}
            </div>

            <div className="flex items-center gap-5">
                <RelationForm
                    items={countries.map((country) => {
                        return {
                            id: country.id ?? "",
                            label: country.name ?? "",
                        };
                    })}
                    value={formData.country_id}
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
                        value={formData.city_id}
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

                {categories.length > 0 && (
                    <RelationForm
                        items={categories.map((category) => ({
                            id: category.id ?? "",
                            label: category.name ?? "",
                        }))}
                        value={formData.category_id}
                        onChange={(id) =>
                            setFormData((prev) => ({
                                ...prev,
                                category_id: id as number,
                            }))
                        }
                        placeholder="Изберете категория"
                        searchPlaceholder="Търсене на категории"
                        emptyText="Няма намерени категории"
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
                        : !company?.id
                          ? "Създаване"
                          : "Записване"}
                </span>
            </Button>
        </form>
    );
}