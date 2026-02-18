"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {
    bannerSchema,
    BannerInput,
} from "@/app/[locale]/admin/banners/[id]/schema";

import { saveBannerAction } from "@/app/[locale]/admin/banners/[id]/actions";
import { Banner } from "@/lib/types";
import { FiLoader, FiSave } from "react-icons/fi";

interface BannerFormProps {
    banner?: Banner | null;
    isEdit?: boolean;
}

export function BannerForm({ banner, isEdit }: BannerFormProps) {
    const router = useRouter();
    const [submitAction, setSubmitAction] = useState<"save" | "save_redirect">(
        "save",
    );
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<BannerInput>({
        resolver: zodResolver(bannerSchema),
        defaultValues: {
            name: banner?.name ?? "",
            link: banner?.link ?? "",
            href: banner?.href ?? "",
            description: banner?.description ?? "",
            button_text: banner?.button_text ?? "Информация",
            group_key: banner?.group_key,
            height: Number(banner?.height ?? 400),
            show_name: Boolean(banner?.show_name ?? false),
            show_description: Boolean(banner?.show_description ?? false),
            show_overlay: Boolean(banner?.show_overlay ?? false),
            show_button: Boolean(banner?.show_button ?? false),
            content_place: banner?.content_place ?? "center_center",
        },
    });

    async function onSubmit(values: BannerInput) {
        setIsLoading(true);

        try {
            const body = isEdit ? { ...values, id: banner?.id } : values;

            const data = await saveBannerAction(body);

            if (data?.error) {
                toast.error(data.error);
                return;
            }

            toast.success(
                isEdit
                    ? "Банерът беше обновен успешно!"
                    : "Банерът беше създаден успешно!",
            );

            if (!banner?.id && data.banner) {
                router.push(`/admin/banners/${data.banner.id}`);
            } else if (submitAction === "save_redirect") {
                router.push("/admin/banners");
            }
        } catch (err) {
            console.error(err);
            toast.error("Възникна грешка");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="p-5">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-2xl">
                        {isEdit ? "Редакция на банер" : "Създаване на банер"}
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-5"
                        >
                            {/* Name */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Име</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Зимен банер"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Link */}
                            <FormField
                                control={form.control}
                                name="link"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Вътрешна връзка</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="/travel"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Поставете линк към вътрешната
                                            страница на сайта, на която искате
                                            да се показва този банер.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Href */}
                            <FormField
                                control={form.control}
                                name="href"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Връзка към страница
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://example.com"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                        <FormDescription>
                                            Поставете линк към страницата, на
                                            която искате да отвежда банера при
                                            кликване.
                                        </FormDescription>
                                    </FormItem>
                                )}
                            />

                            {/* Button Text */}
                            <FormField
                                control={form.control}
                                name="button_text"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Текст на бутона</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Информация"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Description */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Описание</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                className="min-h-40"
                                                placeholder="Описание на банера..."
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Height */}
                            <Controller
                                name="height"
                                control={form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Височина (px)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                value={
                                                    (field.value as
                                                        | number
                                                        | undefined) ?? 0
                                                }
                                                onChange={(e) =>
                                                    field.onChange(
                                                        Number(e.target.value),
                                                    )
                                                }
                                                onBlur={field.onBlur}
                                                name={field.name}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Content Place */}
                                <FormField
                                    control={form.control}
                                    name="content_place"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Позиция на съдържанието
                                            </FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl className="w-full">
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Избери позиция" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="top_left">
                                                        Горе ляво
                                                    </SelectItem>
                                                    <SelectItem value="top_center">
                                                        Горе център
                                                    </SelectItem>
                                                    <SelectItem value="top_right">
                                                        Горе дясно
                                                    </SelectItem>
                                                    <SelectItem value="center_left">
                                                        Център ляво
                                                    </SelectItem>
                                                    <SelectItem value="center_center">
                                                        Център
                                                    </SelectItem>
                                                    <SelectItem value="center_right">
                                                        Център дясно
                                                    </SelectItem>
                                                    <SelectItem value="bottom_left">
                                                        Долу ляво
                                                    </SelectItem>
                                                    <SelectItem value="bottom_center">
                                                        Долу център
                                                    </SelectItem>
                                                    <SelectItem value="bottom_right">
                                                        Долу дясно
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Group */}
                                <FormField
                                    control={form.control}
                                    name="group_key"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Изберете група
                                            </FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl className="w-full">
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Изберете опция" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="none">
                                                        Без група
                                                    </SelectItem>
                                                    <SelectItem value="HOME_ELEMENTS">
                                                        Банери на началната
                                                        страница
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Switches */}
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <FormField
                                    control={form.control}
                                    name="show_name"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                            <FormLabel>
                                                Показване на името
                                            </FormLabel>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={
                                                        field.onChange
                                                    }
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="show_description"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                            <FormLabel>
                                                Показване на описанието
                                            </FormLabel>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={
                                                        field.onChange
                                                    }
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="show_overlay"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                            <FormLabel>
                                                Прилагане на затъмняване
                                            </FormLabel>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={
                                                        field.onChange
                                                    }
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="show_button"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                            <FormLabel>
                                                Показване на бутон
                                            </FormLabel>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={
                                                        field.onChange
                                                    }
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="space-x-5">
                                {/* Записване без пренасочване */}
                                <Button
                                    type="submit"
                                    variant="outline"
                                    size="lg"
                                    disabled={isLoading}
                                    onClick={() => setSubmitAction("save")}
                                >
                                    {isLoading ? (
                                        <FiLoader className="animate-spin" />
                                    ) : (
                                        <FiSave />
                                    )}
                                    {banner?.id
                                        ? "Записване"
                                        : "Създаване на банер"}
                                </Button>

                                <Button
                                    type="submit"
                                    variant="outline"
                                    size="lg"
                                    disabled={isLoading}
                                    onClick={() =>
                                        setSubmitAction("save_redirect")
                                    }
                                >
                                    {isLoading ? (
                                        <FiLoader className="animate-spin" />
                                    ) : (
                                        <FiSave />
                                    )}
                                    {banner?.id
                                        ? "Записване и преглед на всички"
                                        : "Създаване и преглед на всички"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
