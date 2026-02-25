"use client";

import { ReactNode } from "react";
import { Control, FieldValues, Path } from "react-hook-form";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

type FormTextareaProps<T extends FieldValues> = {
    control: Control<T>;
    name: Path<T>;
    label: string;
    placeholder?: string;
    description?: string;
    className?: string;
    rows?: number;
    children?: ReactNode;
};

export function FormTextarea<T extends FieldValues>({
    control,
    name,
    label,
    placeholder,
    description,
    className,
    rows = 4,
    children,
}: FormTextareaProps<T>) {
    return (
        <div className="space-y-2">
            <FormField
                control={control}
                name={name}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl>
                            <Textarea
                                rows={rows}
                                placeholder={placeholder}
                                {...field}
                                className={className}
                            />
                        </FormControl>
                        {description && (
                            <FormDescription>{description}</FormDescription>
                        )}
                        <FormMessage />
                    </FormItem>
                )}
            />
            {children}
        </div>
    );
}