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
import { Cruise } from "@/lib/types";

export interface NewCruise {
    id: number | null;
    name: string;
    slug: string;
    website_url: string;
}

type Params = {
    cruise: Cruise | null;
};

type FormErrors = Partial<Record<keyof Cruise, string>>;

export default function NewCruiseForm({ cruise }: Params) {
    const router = useRouter();

    const [formData, setFormData] = useState<NewCruise>({
        id: cruise?.id ?? null,
        name: cruise?.name ?? "",
        slug: cruise?.slug ?? "",
        website_url: cruise?.website_url ?? "",
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field: keyof NewCruise, value: string) => {
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
            const res = await axios.post("/api/cruises", formData);

            if (res.data.success) {
                toast.success("Круизната компания е запазена!");

                if (res.status === 201)
                    router.push(`/admin/cruises/${res.data.cruiseId}`);
                if (res.status === 200) router.push("/admin/cruises");
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
                <Label>Име на круизната компания *</Label>
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
                {cruise?.id ? "Записване" : "Създаване"}
            </Button>
        </form>
    );
}
