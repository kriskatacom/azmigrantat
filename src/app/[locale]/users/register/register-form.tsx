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
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
        <>
            {errorMessage && (
                <div className="text-base text-center text-red-600">
                    {errorMessage}
                </div>
            )}

            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="text-white space-y-4"
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
                                        className="border-2 border-gray-700"
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
                                        className="border-2 border-gray-700"
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
                                    <Input
                                        type="password"
                                        {...field}
                                        className="border-2 border-gray-700"
                                        placeholder="******"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button
                        type="submit"
                        className={cn(
                            "w-full h-12 text-base font-semibold transition-all duration-200 shadow-lg",
                            "bg-website-dark hover:bg-website-menu-item active:scale-[0.98]",
                            "shadow-emerald-500/20 hover:shadow-emerald-500/30",
                        )}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Проверка...</span>
                            </div>
                        ) : (
                            "Създаване на профил"
                        )}
                    </Button>
                </form>
            </Form>
        </>
    );
}