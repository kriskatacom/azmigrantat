"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";

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
import { cn } from "@/lib/utils";

import { loginSchema, LoginFormValues } from "@/app/[locale]/users/schema";
import { loginAction } from "@/app/[locale]/users/actions";

export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>("");

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: LoginFormValues) {
        setIsLoading(true);
        setErrorMessage("");

        try {
            const response = await loginAction(values);

            if (response.error) {
                setErrorMessage(response.error);
                setIsLoading(false);
                return;
            }

            const role = response.data?.role;
            const redirectUrl = searchParams.get("redirect");

            let finalRedirect = "/";

            if (redirectUrl && redirectUrl.startsWith("/")) {
                finalRedirect = redirectUrl;
            } else if (role === "entrepreneur") {
                finalRedirect = "/users/entrepreneurs/dashboard";
            } else if (role === "admin") {
                finalRedirect = "/admin/dashboard";
            }

            toast.success("Добре дошли отново!");
            router.push(finalRedirect);
        } catch (error: any) {
            setErrorMessage("Възникна неочаквана грешка. Моля, опитайте пак.");
            setIsLoading(false);
        }
    }

    return (
        <div className="w-full space-y-5">
            {errorMessage && (
                <div className="flex items-center gap-2 p-3 text-sm font-medium text-red-500 border border-red-500/20 bg-red-500/10 rounded-lg animate-in fade-in zoom-in duration-200">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errorMessage}</span>
                </div>
            )}

            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="text-white space-y-4"
                >
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
                            "Влизане в профила"
                        )}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
