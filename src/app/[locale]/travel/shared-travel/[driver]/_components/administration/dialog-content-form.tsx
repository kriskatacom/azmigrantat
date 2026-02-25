import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FormInput } from "@/components/forms/form-input";
import { Driver } from "@/lib/services/driver-service";
import { updateDriverAction } from "@/app/[locale]/travel/shared-travel/[driver]/_components/administration/actions";
import { FormBase } from "@/components/forms/form-base";
import { FormTextarea } from "@/components/forms/form-textarea";
import { Button } from "@/components/ui/button";
import { Cpu } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipButton } from "@/components/tooltip-button";

export const projectSchema = z.object({
    name: z.string().min(1, { error: "Моля, въведете името и фамилията си!" }),
    description: z
        .string()
        .min(10, { message: "Описанието трябва да съдържа поне 10 символа." })
        .max(500, {
            message: "Описанието не може да бъде по-дълго от 500 символа.",
        })
        .optional()
        .or(z.literal("")),
});

export type DriverSchemaInput = z.infer<typeof projectSchema>;

type DialogContentFormProps = {
    driver: Driver;
};

export default function DialogContentForm({ driver }: DialogContentFormProps) {
    const form = useForm({
        resolver: zodResolver(projectSchema),
        defaultValues: {
            name: driver.name ?? "",
            description: driver.description ?? "",
        },
    });

    async function onSubmit(data: DriverSchemaInput) {
        const res = await updateDriverAction(driver.id, data);

        if (res.success) {
            toast.success("Промените са запазени!");
        } else {
            toast.error("Фатална грешка! Промените не са запазени.");
        }
    }

    return (
        <div className="px-2 md:px-5">
            <FormBase form={form} onSubmit={onSubmit} submitText="Запазване">
                <FormInput
                    control={form.control}
                    name="name"
                    label="Име и фамилия"
                    placeholder="Въведете името и фамилията си"
                    description="Въведеното име и фамилия ще бъдат видими за всички потребители в платформата. Те се показват в страницата със списъка на шофьорите, във вашия профил, на началната страница и на други места в системата."
                />
                <FormTextarea
                    control={form.control}
                    name="description"
                    label="Описание на проекта"
                    placeholder="Опишете маршрутите и предпочитаните места, на които често пътувате"
                    description="Това поле ще помогне на другите потребители да разберат къде обикновено пътувате и какви маршрути предпочитате. Минимум 10 символа, максимум 500 символа."
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
