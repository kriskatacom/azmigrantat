"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FiLoader, FiSave } from "react-icons/fi";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { extractIframeSrc } from "@/lib/utils";
import { Country, Embassy } from "@/lib/types";
import RichTextEditor from "@/components/rich-text-editor";
import { RelationForm } from "@/components/relation-form";

export interface NewEmbassy {
    name: string;
    slug: string;
    heading: string;
    excerpt: string;
    content: string;
    contactsContent: string;
    googleMap: string;
    id: number | null;
    countryId: number | null;
}

type Params = {
    embassy: Embassy | null;
    countries: Country[];
};

type FormErrors = Partial<Record<keyof NewEmbassy, string>>;

export default function NewEmbassyForm({ embassy, countries }: Params) {
    const router = useRouter();
    const [formData, setFormData] = useState<NewEmbassy>({
        name: embassy?.name ?? "",
        slug: embassy?.slug ?? "",
        heading: embassy?.heading ?? "",
        excerpt: embassy?.excerpt ?? "",
        content: embassy?.content ?? "",
        contactsContent: embassy?.contacts_content ?? "",
        googleMap: embassy?.google_map ?? "",
        id: embassy?.id ?? null,
        countryId: embassy?.country_id ?? null,
    });

    const [description, setDescription] = useState<string>(
        (embassy?.content as string) ?? "",
    );
    const [contactsContent, setContactsContent] = useState<string>(
        (embassy?.contacts_content as string) ?? "",
    );

    const onChange = (description: string) => {
        setDescription(description);
    };
    const onChangeContactsContent = (contactsContent: string) => {
        setContactsContent(contactsContent);
    };

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field: keyof NewEmbassy, value: string) => {
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
            formData.content = description;
            formData.contactsContent = contactsContent;
            const res = await axios.post("/api/embassies", formData);

            if (res.data.success) {
                toast.success("Промените са запазени!");

                if (res.status === 201)
                    router.push(`/admin/embassies/${res.data.embassyId}`);
                if (res.status === 200) router.push("/admin/embassies");
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
            googleMap: src ?? value,
        }));
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="m-5 p-5 border rounded-md space-y-10"
        >
            <div>
                <Label className="mb-1" htmlFor="email">
                    Име на посолството *
                </Label>
                <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Въведете името на посолството"
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
                    placeholder="Въведете URL адрес на посолството"
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
                    placeholder="Въведете заглавие на страницата на посолството"
                    disabled={isSubmitting}
                />
                {errors.heading && (
                    <p className="text-sm text-red-500 mt-1">
                        {errors.heading}
                    </p>
                )}
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
                    value={formData.countryId}
                    onChange={(id) =>
                        setFormData((prev) => ({
                            ...prev,
                            countryId:
                                typeof id === "string"
                                    ? parseInt(id, 10) || null
                                    : id,
                        }))
                    }
                    placeholder="Изберете държава"
                    searchPlaceholder="Търсене на държава"
                    emptyText="Няма намерени държави"
                />
            </div>

            <div>
                <Label className="mb-1" htmlFor="companySlogan">
                    Google Map
                </Label>
                <Input
                    id="googleMap"
                    value={formData.googleMap}
                    onChange={(e) => handleGoogleMapChange(e.target.value)}
                    placeholder="Въведете URL адрес на карта от Google Map"
                    disabled={isSubmitting}
                />
                {errors.googleMap && (
                    <p className="text-sm text-red-500 mt-1">
                        {errors.googleMap}
                    </p>
                )}
                {formData.googleMap && (
                    <div className="mt-4 w-full h-100 rounded-md overflow-hidden border">
                        <iframe
                            src={formData.googleMap}
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

            <div className="rounded-md">
                <h2 className="text-xl font-semibold mb-5">За посолството</h2>
                <div className="text-editor max-w-5xl max-h-200 overflow-auto">
                    <RichTextEditor content={description} onChange={onChange} />
                </div>
            </div>

            <div className="rounded-md">
                <h2 className="text-xl font-semibold mb-5">
                    Информация за контакти
                </h2>
                <div className="text-editor max-w-5xl max-h-200 overflow-auto">
                    <RichTextEditor
                        content={contactsContent}
                        onChange={onChangeContactsContent}
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
                        : !embassy?.id
                          ? "Създаване"
                          : "Записване"}
                </span>
            </Button>
        </form>
    );
}
