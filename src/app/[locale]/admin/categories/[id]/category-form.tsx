"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FiLoader, FiSave } from "react-icons/fi";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Category } from "@/lib/types";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CategoryNode } from "@/app/[locale]/admin/categories/[id]/page";

export interface NewCategory {
    name: string;
    slug: string;
    heading: string;
    excerpt: string;
    parentId: number | null;
    id: number | null;
}

type Params = {
    category: Category | null;
    categories: CategoryNode[];
};

type FormErrors = Partial<Record<keyof NewCategory, string>>;

export default function NewCategoryForm({ category, categories }: Params) {
    const router = useRouter();
    const [formData, setFormData] = useState<NewCategory>({
        name: category?.name ?? "",
        slug: category?.slug ?? "",
        heading: category?.heading ?? "",
        excerpt: category?.excerpt ?? "",
        parentId: category?.parent_id ?? null,
        id: category?.id ?? null,
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field: keyof NewCategory, value: string) => {
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
            const res = await axios.post("/api/categories", formData);

            if (res.data.success) {
                toast.success("Промените са запазени!");

                if (res.status === 201)
                    router.push(`/admin/categories/${res.data.categoryId}`);
                if (res.status === 200) router.push("/admin/categories");
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
            className="m-5 p-5 border rounded-md space-y-10"
        >
            <div>
                <Label className="mb-1" htmlFor="name">
                    Име на категорията *
                </Label>
                <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Въведете името на категорията"
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
                    placeholder="Въведете URL адрес на категорията"
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
                    placeholder="Въведете заглавие на страницата на категорията"
                    disabled={isSubmitting}
                />
                {errors.heading && (
                    <p className="text-sm text-red-500 mt-1">
                        {errors.heading}
                    </p>
                )}
            </div>

            <div>
                <Label className="mb-1">Родителска категория</Label>

                <Select
                    value={formData.parentId ? String(formData.parentId) : "0"}
                    onValueChange={(value) =>
                        handleChange("parentId", value === "0" ? "" : value)
                    }
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Изберете родителска категория" />
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem value="0">Няма родител</SelectItem>

                        {renderCategoryOptions(categories)}
                    </SelectContent>
                </Select>

                {errors.parentId && (
                    <p className="text-sm text-red-500 mt-1">
                        {errors.parentId}
                    </p>
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
                        : !category?.id
                          ? "Създаване"
                          : "Записване"}
                </span>
            </Button>
        </form>
    );
}

export const renderCategoryOptions = (nodes: CategoryNode[], level = 0) =>
    nodes.map((cat) => (
        <Fragment key={cat.id}>
            <SelectItem value={String(cat.id)}>
                {"— ".repeat(level)}
                {cat.name}
            </SelectItem>

            {cat.children.length > 0 &&
                renderCategoryOptions(cat.children, level + 1)}
        </Fragment>
    ));