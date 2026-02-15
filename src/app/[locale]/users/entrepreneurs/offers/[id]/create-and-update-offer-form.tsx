"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Category, City, Company, Country, Offer } from "@/lib/types";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    createOfferAction,
    updateOfferAction,
} from "@/app/[locale]/users/entrepreneurs/offers/actions";
import { SaveIcon } from "lucide-react";
import { FaSpinner } from "react-icons/fa";
import { CreateOfferFormValues, createOfferSchema } from "./schema";
import { Switch } from "@/components/ui/switch";
import RichTextEditor from "@/components/rich-text-editor";
import axios from "axios";

type Props = {
    offer: Offer | null;
    companies: Company[];
    countries: Country[];
    categories: Category[];
};

export function CreateAndUpdateOfferForm({
    offer,
    companies,
    countries,
    categories,
}: Props) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const form = useForm<CreateOfferFormValues>({
        resolver: zodResolver(createOfferSchema),
        defaultValues: {
            name: offer?.name || "",
            heading: offer?.heading || "",
            description: offer?.description || "",
            content: offer?.content || "",
            show_name: !!offer?.show_name || true,
            show_description: !!offer?.show_description || false,
            show_overlay: !!offer?.show_overlay || false,
            show_button: !!offer?.show_button || false,
            href: offer?.href ?? "",
            status: offer?.status || "pending",
            company_id: offer?.company_id || null,
            country_id: offer?.country_id || null,
            city_id: offer?.city_id || null,
            category_id: offer?.category_id || null,
        },
    });

    const [cities, setCities] = useState<City[]>([]);
    const [isCitiesLoading, setIsCitiesLoading] = useState(false);
    const countryId = form.watch("country_id");

    const onSubmit = async (values: CreateOfferFormValues) => {
        setIsLoading(true);
        const result = offer
            ? await updateOfferAction(offer.id, values)
            : await createOfferAction(values);

        if (result.success) {
            toast.success(result.message);
            if (!offer?.id && result.offer) {
                router.push(`/users/entrepreneurs/offers/${result.offer.id}`);
            }
        } else {
            toast.error(result.message);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (!form.getValues("country_id")) {
            setCities([]);
            form.setValue("city_id", null);
            return;
        }

        setIsCitiesLoading(true);

        const fetchCities = async () => {
            try {
                const res = await axios.get(
                    `/api/cities?countryId=${form.getValues("country_id")}`,
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
    }, [countryId]);

    return (
        <div className={`${!offer?.id ? "p-5" : "px-5 pb-5"}`}>
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-2xl">
                        {offer?.id
                            ? "Редактиране на обява"
                            : "Създаване на обява"}
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-5">
                    {errorMessage && (
                        <div className="text-red-600 text-center text-base">
                            {errorMessage}
                        </div>
                    )}

                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-4"
                        >
                            {/* Име */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Име</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Пролетна кампания"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid md:grid-cols-2 grid-cols-3 xl:grid-cols-4 gap-5">
                                <FormField
                                    control={form.control}
                                    name="company_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Компания</FormLabel>
                                            <FormControl>
                                                <Select
                                                    value={
                                                        field.value?.toString() ||
                                                        ""
                                                    }
                                                    onValueChange={(val) =>
                                                        field.onChange(
                                                            Number(val),
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Избиране на компания" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {companies.map(
                                                            (
                                                                company,
                                                                index,
                                                            ) => (
                                                                <SelectItem
                                                                    key={
                                                                        company.id
                                                                    }
                                                                    value={company.id.toString()}
                                                                >
                                                                    {
                                                                        company.name
                                                                    }
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="country_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Държава</FormLabel>
                                            <FormControl>
                                                <Select
                                                    value={
                                                        field.value?.toString() ||
                                                        ""
                                                    }
                                                    onValueChange={(val) =>
                                                        field.onChange(
                                                            Number(val),
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Избиране на държава" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {countries.map(
                                                            (
                                                                country,
                                                                index,
                                                            ) => (
                                                                <SelectItem
                                                                    key={
                                                                        country.id
                                                                    }
                                                                    value={country.id.toString()}
                                                                >
                                                                    {
                                                                        country.name
                                                                    }
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="city_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Град</FormLabel>
                                            <FormControl>
                                                <Select
                                                    value={
                                                        field.value?.toString() ||
                                                        ""
                                                    }
                                                    onValueChange={(val) =>
                                                        field.onChange(
                                                            Number(val),
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Избиране на град" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {cities.map(
                                                            (city, index) => (
                                                                <SelectItem
                                                                    key={
                                                                        city.id
                                                                    }
                                                                    value={city.id.toString()}
                                                                >
                                                                    {city.name}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="category_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Категория</FormLabel>
                                            <FormControl>
                                                <Select
                                                    value={
                                                        field.value?.toString() ||
                                                        ""
                                                    }
                                                    onValueChange={(val) =>
                                                        field.onChange(
                                                            Number(val),
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Избиране на категория" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categories.map(
                                                            (
                                                                category,
                                                                index,
                                                            ) => (
                                                                <SelectItem
                                                                    key={
                                                                        category.id
                                                                    }
                                                                    value={category.id.toString()}
                                                                >
                                                                    {
                                                                        category.name
                                                                    }
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Заглавие */}
                            {/* <FormField
                                control={form.control}
                                name="heading"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Заглавие (по избор)
                                        </FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            /> */}

                            {/* Описание */}
                            {/* <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Кратко описание (по избор)
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                className="min-h-40"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            /> */}

                            {/* Съдържание */}
                            {/* <FormField
                                control={form.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Съдържание (по избор)
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                className="min-h-40"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            /> */}

                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Статус</FormLabel>
                                        <FormControl>
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Избери статус" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pending">
                                                        В процес на обрабовка
                                                    </SelectItem>
                                                    <SelectItem value="draft">
                                                        Чернова
                                                    </SelectItem>
                                                    <SelectItem value="active">
                                                        Активна
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <FormField
                                    control={form.control}
                                    name="show_name"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                            <FormLabel>
                                                Показване на заглавие
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

                            <div className="rounded-md">
                                <h2 className="text-xl font-semibold mb-5">
                                    Описание
                                </h2>
                                <div className="text-editor max-w-5xl max-h-200 overflow-auto">
                                    <RichTextEditor
                                        content={
                                            form.getValues(
                                                "description",
                                            ) as string
                                        }
                                        onChange={(value) =>
                                            form.setValue("description", value)
                                        }
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                size="xl"
                                disabled={isLoading}
                            >
                                {!isLoading ? (
                                    <SaveIcon />
                                ) : (
                                    <FaSpinner className="repeat-infinite animate-spin" />
                                )}
                                <span>
                                    {isLoading
                                        ? "Създаване..."
                                        : offer?.id
                                          ? "Запазване на обявата"
                                          : "Създаване на обявата"}
                                </span>
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}