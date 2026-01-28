"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FiLoader, FiSave } from "react-icons/fi";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Country, Landmark } from "@/lib/types";
import RichTextEditor from "@/components/rich-text-editor";
import { RelationForm } from "@/components/relation-form";
import { extractIframeSrc, googleMapsLinkToDirections } from "@/lib/utils";

export interface NewLandmark {
    name: string;
    slug: string;
    heading: string;
    excerpt: string;
    content: string;
    contactsContent: string;
    workingTime: string;
    tickets: string;
    googleMap: string;
    your_location: string;
    id: number | null;
    countryId: number | null;
}

type Params = {
    landmark: Landmark | null;
    countries: Country[];
};

type FormErrors = Partial<Record<keyof NewLandmark, string>>;

export default function NewLandmarkForm({ landmark, countries }: Params) {
    const router = useRouter();
    const [formData, setFormData] = useState<NewLandmark>({
        name: landmark?.name ?? "",
        slug: landmark?.slug ?? "",
        heading: landmark?.heading ?? "",
        excerpt: landmark?.excerpt ?? "",
        content: landmark?.content ?? "",
        contactsContent: landmark?.contacts_content ?? "",
        workingTime: landmark?.working_time ?? "",
        tickets: landmark?.tickets ?? "",
        googleMap: landmark?.google_map ?? "",
        your_location: landmark?.your_location ?? "",
        id: landmark?.id ?? null,
        countryId: landmark?.country_id ?? null,
    });

    const [description, setDescription] = useState<string>(
        (landmark?.content as string) ?? "",
    );
    const [contactsContent, setContactsContent] = useState<string>(
        (landmark?.contacts_content as string) ?? "",
    );
    const [workingTimeContent, setWorkingTimeContent] = useState<string>(
        (landmark?.working_time as string) ?? "",
    );
    const [ticketsContent, setTicketsContent] = useState<string>(
        (landmark?.tickets as string) ?? "",
    );

    const onChange = (description: string) => {
        setDescription(description);
    };
    const onChangeContactsContent = (contactsContent: string) => {
        setContactsContent(contactsContent);
    };
    const onChangeWorkingTimeContent = (workingTimeContent: string) => {
        setWorkingTimeContent(workingTimeContent);
    };
    const onChangeTicketsContent = (ticketsContent: string) => {
        setTicketsContent(ticketsContent);
    };

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field: keyof NewLandmark, value: string) => {
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
            formData.workingTime = workingTimeContent;
            formData.tickets = ticketsContent;
            const res = await axios.post("/api/landmarks", formData);

            if (res.data.success) {
                toast.success("Промените са запазени!");

                if (res.status === 201)
                    router.push(`/admin/landmarks/${res.data.landmarkId}`);
                if (res.status === 200) router.push("/admin/landmarks");
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

    const handleGoogleMapChange = (value: string) => {
        const src = extractIframeSrc(value);

        setFormData((prev) => ({
            ...prev,
            googleMap: src ?? value,
        }));
    };

    const isValidUrl = (url: string) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="m-5 p-5 border rounded-md space-y-10"
        >
            <div>
                <Label className="mb-1" htmlFor="email">
                    Име на забележителност *
                </Label>
                <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Въведете името на забележителност"
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
                    placeholder="Въведете URL адрес на забележителност"
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
                    placeholder="Въведете заглавие на страницата на забележителност"
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
                <Label className="mb-1" htmlFor="googleMap">
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
                <h2 className="text-xl font-semibold mb-5">
                    За забележителността
                </h2>
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

            <div className="rounded-md">
                <h2 className="text-xl font-semibold mb-5">Работно време</h2>
                <div className="text-editor max-w-5xl max-h-200 overflow-auto">
                    <RichTextEditor
                        content={workingTimeContent}
                        onChange={onChangeWorkingTimeContent}
                    />
                </div>
            </div>

            <div className="rounded-md">
                <h2 className="text-xl font-semibold mb-5">Билети</h2>
                <div className="text-editor max-w-5xl max-h-200 overflow-auto">
                    <RichTextEditor
                        content={ticketsContent}
                        onChange={onChangeTicketsContent}
                    />
                </div>
            </div>

            <div>
                <Label className="mb-1" htmlFor="your_location">
                    Вашето местонахождение
                </Label>
                <Input
                    id="your_location"
                    value={formData.your_location}
                    onChange={(e) => handleChange("your_location", e.target.value)}
                    placeholder="Въведете URL адрес от Вашето местонахождение до адреса на посолството"
                    disabled={isSubmitting}
                />
                {errors.your_location && (
                    <p className="text-sm text-red-500 mt-1">
                        {errors.your_location}
                    </p>
                )}
                {formData.your_location && (
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
                        : !landmark?.id
                          ? "Създаване"
                          : "Записване"}
                </span>
            </Button>
        </form>
    );
}
