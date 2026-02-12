"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FiLoader, FiSave } from "react-icons/fi";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Country } from "@/lib/types";
import RichTextEditor from "@/components/rich-text-editor";

export interface NewCountry {
    name: string;
    slug: string;
    heading: string;
    excerpt: string;
    id: number | null;
}

type Params = {
    country: Country | null;
    countries: Country[];
};

type FormErrors = Partial<Record<keyof NewCountry, string>>;

export default function NewCountryForm({ country, countries }: Params) {
    const router = useRouter();
    const [formData, setFormData] = useState<NewCountry>({
        name: country?.name ?? "",
        slug: country?.slug ?? "",
        heading: country?.heading ?? "",
        excerpt: country?.excerpt ?? "",
        id: country?.id ?? null,
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field: keyof NewCountry, value: string) => {
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
            const res = await axios.post("/api/countries", formData);

            if (res.data.success) {
                toast.success("Промените са запазени!");

                if (res.status === 201)
                    router.push(`/admin/countries/${res.data.countryId}`);
                if (res.status === 200) router.push("/admin/countries");
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

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-background m-5 p-5 border rounded-md space-y-10"
        >
            <div>
                <Label className="mb-1" htmlFor="email">
                    Име на държавата *
                </Label>
                <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Въведете името на държавата"
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
                    placeholder="Въведете URL адрес на държавата"
                    disabled={isSubmitting}
                />
                {errors.slug && (
                    <p className="text-sm text-red-500 mt-1">{errors.slug}</p>
                )}
            </div>

            <div>
                <Label className="mb-1" htmlFor="heading">
                    Заглавие на страницата *
                </Label>
                <Input
                    id="heading"
                    type="text"
                    value={formData.heading}
                    onChange={(e) => handleChange("heading", e.target.value)}
                    placeholder="Въведете заглавие на страницата на държавата"
                    disabled={isSubmitting}
                />
                {errors.heading && (
                    <p className="text-sm text-red-500 mt-1">
                        {errors.heading}
                    </p>
                )}
            </div>

            <div className="rounded-md">
                <h2 className="text-xl font-semibold mb-5">Описание</h2>
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
                        : !country?.id
                          ? "Създаване"
                          : "Записване"}
                </span>
            </Button>
        </form>
    );
}
