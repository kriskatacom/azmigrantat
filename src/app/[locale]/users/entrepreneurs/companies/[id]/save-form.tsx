"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SaveIcon } from "lucide-react";
import { FaSpinner } from "react-icons/fa";

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
import { Company } from "@/lib/types";
import { createCompanySchema, CreateCompanyFormValues } from "./schema";
import { updateCompanyAction } from "./actions";

type Props = {
    company: Company | null;
    companyId: number;
};

export function SaveForm({ company, companyId }: Props) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<CreateCompanyFormValues>({
        resolver: zodResolver(createCompanySchema),
        defaultValues: {
            facebook_page_link: company?.facebook_page_link || "",
        },
    });

    const onSubmit = async (values: CreateCompanyFormValues) => {
        setIsLoading(true);
        const result = await updateCompanyAction(companyId, values);

        if (result.success) {
            toast.success(result.message);
            if (!company?.id && result.company) {
                router.push(
                    `/users/entrepreneurs/companies/${result.company.id}`,
                );
            }
        } else {
            toast.error(result.message);
        }
        setIsLoading(false);
    };

    return (
        <div className="p-5">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-2xl">
                        {company?.id
                            ? "Редактиране на компания"
                            : "Създаване на компания"}
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-5">
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-4"
                        >
                            <FormField
                                control={form.control}
                                name="facebook_page_link"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Facebook страница (ID)</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Поставете (ID) на Facebook страница"
                                                {...field}
                                            />
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
                                        : "Запазване на промените"}
                                </span>
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
