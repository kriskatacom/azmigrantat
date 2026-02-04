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
import { Banner } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";

export interface NewBanner {
    id: number | null;
    name: string;
    link: string;
    description: string;
    height: number;
}

type Params = {
    banner: Banner | null;
};

type FormErrors = Partial<Record<keyof Banner, string>>;

export default function NewBannerForm({ banner }: Params) {
    const router = useRouter();

    const [formData, setFormData] = useState<NewBanner>({
        id: banner?.id ?? null,
        name: banner?.name ?? "",
        link: banner?.link ?? "",
        description: banner?.description ?? "",
        height: banner?.height ?? 520,
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field: keyof NewBanner, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const validate = () => {
        const newErrors: FormErrors = {};

        if (!formData.name) newErrors.name = "Името е задължително";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);

        try {
            const res = await axios.post("/api/banners", formData);

            if (res.data.success) {
                toast.success("Банерът е запазен!");

                if (res.status === 201)
                    router.push(`/admin/banners/${res.data.bannerId}`);
                if (res.status === 200) router.push("/admin/banners");
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
                <Label>Име на банера *</Label>
                <Input
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                />
                {errors.name && (
                    <div className="text-destructive">{errors.name}</div>
                )}
            </div>

            <div className="space-y-2">
                <Label>Височина на изображението (px)</Label>
                <Input
                    value={formData.height}
                    onChange={(e) => handleChange("height", e.target.value)}
                />
                {errors.name && (
                    <div className="text-destructive">{errors.height}</div>
                )}
            </div>

            <div className="space-y-2">
                <Label>Линк към страницата</Label>
                <Input
                    value={formData.link}
                    onChange={(e) => handleChange("link", e.target.value)}
                />
            </div>

            {formData.id && (
                <>
                    <div className="space-y-2">
                        <Label>Описание</Label>
                        <Textarea
                            value={formData.description}
                            className="min-h-40"
                            onChange={(e) =>
                                handleChange("description", e.target.value)
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
                {banner?.id ? "Записване" : "Създаване"}
            </Button>
        </form>
    );
}