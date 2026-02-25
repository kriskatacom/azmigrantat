"use client";

import z from "zod";
import { Cpu } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FormBase } from "@/components/forms/form-base";
import { FormTextarea } from "@/components/forms/form-textarea";
import { TooltipButton } from "@/components/tooltip-button";
import { Driver } from "@/lib/services/driver-service";
import { updateDriverPostAction } from "@/app/[locale]/travel/shared-travel/[driver]/administration/actions";

export const postSchema = z.object({
    post_description: z
        .string()
        .max(1000, {
            message: "Описанието не може да бъде по-дълго от 1000 символа.",
        })
        .optional()
        .or(z.literal("")),
});

export type DriverPostSchemaInput = z.infer<typeof postSchema>;

export default function PostTab({ driver }: { driver: Driver }) {
    const form = useForm({
        resolver: zodResolver(postSchema),
        defaultValues: {
            post_description: driver.post_description ?? "",
        },
    });

    async function onSubmit(data: DriverPostSchemaInput) {
        const res = await updateDriverPostAction(driver.id, data);

        if (res.success) {
            toast.success("Промените са запазени!");
        } else {
            toast.error("Фатална грешка! Промените не са запазени.");
        }
    }

    return (
        <div className="p-2 md:p-5">
            <FormBase form={form} onSubmit={onSubmit} submitText="Запазване">
                <FormTextarea
                    control={form.control}
                    name="post_description"
                    label="Описание на пътуването"
                    placeholder="Опишете маршрутите и предпочитаните места, на които често пътувате"
                    description="Опишете предстоящото пътуване – маршрут, дата, час на тръгване и допълнителна информация, която би била полезна за другите пътници. Максимум 1000 символа."
                    rows={20}
                    className="min-h-40"
                >
                    <TooltipButton tooltipText="AI ще ви помогне с дописване">
                        <Cpu className="w-5 h-5" />
                        Започнете AI помощ
                    </TooltipButton>
                </FormTextarea>
            </FormBase>
        </div>
    );
}