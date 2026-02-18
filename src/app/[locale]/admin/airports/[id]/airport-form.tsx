"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FiLoader, FiSave } from "react-icons/fi";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Airport, Coordinates, Country } from "@/lib/types";
import RichTextEditor from "@/components/rich-text-editor";
import { RelationForm } from "@/components/relation-form";
import { extractCoordinatesFromLocationLink, slugify } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
    ssr: false,
});

export interface CreateAirportInput {
    id: number | null;
    name: string;
    slug: string;
    coordinates: Coordinates | null;
    location_link: string;
    description: string;
    website_url: string;
    country_id?: number | null;
}

type Params = {
    airport: Airport | null;
    countries: Country[];
};

type FormErrors = Partial<Record<keyof CreateAirportInput, string>>;

export default function CreateAirportInputForm({ airport, countries }: Params) {
    const router = useRouter();

    const [formData, setFormData] = useState<CreateAirportInput>({
        id: airport?.id ?? null,
        name: airport?.name ?? "",
        slug: airport?.slug ?? "",
        coordinates: airport?.coordinates ?? null,
        description: airport?.description ?? "",
        location_link: airport?.location_link ?? "",
        website_url: airport?.website_url ?? "",
        country_id: airport?.country_id ?? null,
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [hasCoordinates, setHasCoordinates] = useState(
        !!airport?.coordinates,
    );

    const handleChange = (field: keyof CreateAirportInput, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const validate = () => {
        const newErrors: FormErrors = {};

        if (!formData.name) newErrors.name = "Името е задължително";
        if (!formData.slug) newErrors.slug = "URL адресът е задължителен";
        if (!formData.country_id) newErrors.country_id = "Изберете държава";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);

        try {
            const res = await axios.post("/api/airports", formData);

            if (res.data.success) {
                toast.success("Летището е запазено!");

                if (res.status === 201)
                    router.push(`/admin/airports/${res.data.airportId}`);
                if (res.status === 200) router.push("/admin/airports");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Грешка при запис");
        } finally {
            setIsSubmitting(false);
        }
    };

    const onToggleCoordinates = () => {
        if (hasCoordinates) {
            setHasCoordinates(false);
            setFormData((prev) => ({
                ...prev,
                coordinates: null,
            }));
            return;
        }

        if (!canLoadCoordinates(formData.location_link)) {
            setHasCoordinates(false);
            return;
        }

        const coordinates = extractCoordinatesFromLocationLink(
            formData.location_link,
        );

        setHasCoordinates(Boolean(coordinates));

        if (!coordinates) {
            setErrors({
                coordinates:
                    "Моля, въведете валиден линк към локацията, например от Google Maps.",
            });
            return;
        }

        if (coordinates) {
            setFormData((prev) => ({
                ...prev,
                coordinates,
            }));
            setErrors({ coordinates: "" });
        }
    };

    const canLoadCoordinates = (locationLink?: string) => {
        return (
            typeof locationLink === "string" && locationLink.trim().length > 0
        );
    };

    return (
        <div className="p-5">
            <Card>
                <form
                    onSubmit={handleSubmit}
                    className="px-5 space-y-10"
                >
                    <div className="space-y-2">
                        <Label>Име на летището *</Label>
                        <Input
                            value={formData.name}
                            onChange={(e) =>
                                handleChange("name", e.target.value)
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Slug *</Label>
                        <Input
                            value={formData.slug}
                            onChange={(e) =>
                                handleChange("slug", e.target.value)
                            }
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

                    {formData.id && (
                        <>
                            <div className="space-y-2">
                                <Label>Описание</Label>
                                <RichTextEditor
                                    content={formData.description}
                                    onChange={(v) =>
                                        handleChange("description", v)
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Официален сайт</Label>
                                <Input
                                    value={formData.website_url}
                                    onChange={(e) =>
                                        handleChange(
                                            "website_url",
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Линк към локацията</Label>

                                <Input
                                    value={formData.location_link ?? ""}
                                    placeholder="https://maps.google.com/..."
                                    onChange={(e) =>
                                        handleChange(
                                            "location_link",
                                            e.target.value,
                                        )
                                    }
                                />

                                {errors.coordinates && (
                                    <div className="text-destructive">
                                        {errors.coordinates}
                                    </div>
                                )}

                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={
                                        !canLoadCoordinates(
                                            formData.location_link,
                                        ) && !hasCoordinates
                                    }
                                    onClick={onToggleCoordinates}
                                >
                                    {!hasCoordinates
                                        ? "Зареждане на координатите"
                                        : "Премахване на координатите"}
                                </Button>
                            </div>

                            {hasCoordinates && formData.coordinates && (
                                <LeafletMap
                                    center={formData.coordinates}
                                    zoom={14}
                                    markers={[
                                        {
                                            id: "preview",
                                            coordinates: formData.coordinates,
                                            label: formData.name || "Локация",
                                            description:
                                                formData.description ?? "",
                                            image: airport?.image_url,
                                            websiteUrl: formData.website_url,
                                        },
                                    ]}
                                />
                            )}

                            {!hasCoordinates && !formData.location_link && (
                                <p className="text-sm text-gray-500">
                                    Поставете Google Maps линк и натисни
                                    „Зареждане“
                                </p>
                            )}
                        </>
                    )}

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
                                    Моля, изберете държава на летището!
                                </div>
                            )}
                        </div>
                    </div>

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
                        {airport?.id ? "Записване" : "Създаване"}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
