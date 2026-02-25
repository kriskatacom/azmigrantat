"use client";

import { ReactNode } from "react";
import { UseFormReturn, FieldValues } from "react-hook-form";
import { SaveIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Form } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import { TooltipButton } from "@/components/tooltip-button";

type FormBaseProps<T extends FieldValues> = {
    form: UseFormReturn<T>;
    onSubmit: (values: T) => Promise<void> | void;
    children: ReactNode;
    submitText?: string;
    loading?: boolean;
    className?: string;
    buttonClassName?: string;
};

export function FormBase<T extends FieldValues>({
    form,
    onSubmit,
    children,
    submitText = "Submit",
    loading,
    className,
    buttonClassName,
}: FormBaseProps<T>) {
    const isLoading = loading ?? form.formState.isSubmitting;

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className={`space-y-6 ${className ?? ""}`}
            >
                <fieldset disabled={isLoading} className="space-y-6">
                    {children}
                </fieldset>

                <TooltipButton
                    type="submit"
                    disabled={isLoading}
                    className={cn("text-base", buttonClassName)}
                    size={"lg"}
                    tooltipText="Запазване на промените"
                >
                    {isLoading && <Spinner className="h-4 w-4" />}
                    {!isLoading && <SaveIcon className="h-4 w-4" />}
                    {isLoading ? "Зареждане..." : submitText}
                </TooltipButton>
            </form>
        </Form>
    );
}