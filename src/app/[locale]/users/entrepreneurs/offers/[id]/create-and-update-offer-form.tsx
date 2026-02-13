"use client";

import { useState } from "react";
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
import {
    createAdSchema,
    CreateAdFormValues,
} from "@/app/[locale]/users/entrepreneurs/ads/[id]/schema";
import { Ad, Company, Offer } from "@/lib/types";
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

type Props = {
    offer: Offer | null;
    companies: Company[];
};

export function CreateAndUpdateOfferForm({ offer, companies }: Props) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const form = useForm<CreateAdFormValues>({
        resolver: zodResolver(createAdSchema),
        defaultValues: {
            name: offer?.name || "",
            heading: offer?.heading || "",
            description: offer?.description || "",
            content: offer?.content || "",
            status: offer?.status || "pending",
            company_id: offer?.company_id || null,
        },
    });

    const onSubmit = async (values: CreateAdFormValues) => {
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
                                                    field.onChange(Number(val))
                                                }
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Избиране на компания" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {companies.map(
                                                        (company, index) => (
                                                            <SelectItem
                                                                key={company.id}
                                                                value={company.id.toString()}
                                                            >
                                                                {company.name}
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