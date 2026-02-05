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
import { Airport, Country } from "@/lib/types";
import RichTextEditor from "@/components/rich-text-editor";
import { RelationForm } from "@/components/relation-form";
import { MapMarker } from "@/components/leaflet-map";
import { slugify } from "@/lib/utils";

const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
    ssr: false,
});

export interface NewAirport {
    id: number | null;
    name: string;
    slug: string;
    iata_code: string;
    icao_code: string;
    description: string;
    latitude: number;
    longitude: number;
    website_url: string;
    country_id?: number | null;
}

type Params = {
    airport: Airport | null;
    countries: Country[];
};

type FormErrors = Partial<Record<keyof NewAirport, string>>;

export default function NewAirportForm({ airport, countries }: Params) {
    const router = useRouter();

    const [formData, setFormData] = useState<NewAirport>({
        id: airport?.id ?? null,
        name: airport?.name ?? "",
        slug: airport?.slug ?? "",
        iata_code: airport?.iata_code ?? "",
        icao_code: airport?.icao_code ?? "",
        description: airport?.description ?? "",
        latitude: airport?.latitude ?? 0,
        longitude: airport?.longitude ?? 0,
        website_url: airport?.website_url ?? "",
        country_id: airport?.country_id ?? null,
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field: keyof NewAirport, value: string) => {
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

    return (
        <form
            onSubmit={handleSubmit}
            className="m-5 p-5 border rounded-md space-y-10"
        >
            <div className="space-y-2">
                <Label>Име на летището *</Label>
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

            {formData.id && (
                <>
                    <div className="space-y-2">
                        <Label>Описание</Label>
                        <RichTextEditor
                            content={formData.description}
                            onChange={(v) => handleChange("description", v)}
                        />
                    </div>

                    <div className="flex gap-5">
                        <div className="flex-1 space-y-2">
                            <Label>Lat</Label>
                            <Input
                                placeholder="Latitude"
                                value={formData.latitude}
                                onChange={(e) =>
                                    handleChange("latitude", e.target.value)
                                }
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <Label>Lon</Label>
                            <Input
                                placeholder="Longitude"
                                value={formData.longitude}
                                onChange={(e) =>
                                    handleChange("longitude", e.target.value)
                                }
                            />
                        </div>
                    </div>

                    {formData.latitude &&
                    formData.longitude &&
                    formData.website_url ? (
                        <LeafletMap
                            center={[formData.latitude, formData.longitude]}
                            zoom={7}
                            markers={[
                                {
                                    id: "1",
                                    lat: formData.latitude,
                                    lng: formData.longitude,
                                    label: formData.name,
                                    description: formData.description,
                                    image: airport?.image_url ?? "",
                                    websiteUrl: formData.website_url,
                                } as MapMarker,
                            ]}
                        />
                    ) : null}

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
    );
}
