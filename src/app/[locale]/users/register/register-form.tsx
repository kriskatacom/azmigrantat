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
    registerSchema,
    RegisterFormValues,
} from "@/app/[locale]/users/register/schema";
import { registerAction } from "@/app/[locale]/users/actions";

export function RegisterForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>("");

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: RegisterFormValues) {
        setIsLoading(true);

        try {
            const data = await registerAction(values);

            if (data.error) {
                setErrorMessage(data.error);
                return toast.error(data.error);
            }

            toast.success("Профилът беше създаден успешно!");
        } catch (error: any) {
            toast.error("Грешка при регистрация");
            setIsLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-lg mx-auto my-5 md:my-10">
            <CardHeader>
                <CardTitle className="md:text-2xl text-center">
                    Създаване на профил
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
                {errorMessage && (
                    <div className="text-base text-center text-red-600">
                        {errorMessage}
                    </div>
                )}

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Име</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Иван Иванов"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="ivan@example.com"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Парола</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button
                            type="submit"
                            className="w-full"
                            size={"xl"}
                            disabled={isLoading}
                        >
                            {isLoading ? "Създаване..." : "Регистрация"}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
