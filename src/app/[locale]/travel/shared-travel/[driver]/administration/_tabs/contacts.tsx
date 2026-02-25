import { Trash2, Plus } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FormInput } from "@/components/forms/form-input";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Driver } from "@/lib/services/driver-service";
import { updateDriverContactsAction } from "@/app/[locale]/travel/shared-travel/[driver]/administration/actions";
import { FormBase } from "@/components/forms/form-base";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export const contactsSchema = z.object({
    contact_methods: z.array(
        z.object({
            type: z.string().min(1, "Изберете тип"),
            value: z.string().min(1, "Попълнете стойност"),
        }),
    ),
});

const CONTACT_TYPES = [
    { label: "Телефон", value: "phone" },
    { label: "Имейл", value: "email" },
    { label: "Физически адрес", value: "address" },
    { label: "Viber", value: "viber" },
    { label: "WhatsApp", value: "whatsapp" },
    { label: "Telegram", value: "telegram" },
];

export type ContactsSchemaInput = z.infer<typeof contactsSchema>;

export default function ContactsTab({ driver }: { driver: Driver }) {
    const parsedContacts =
        driver.contact_methods && typeof driver.contact_methods === "string"
            ? JSON.parse(driver.contact_methods)
            : (driver.contact_methods ?? []);

    const form = useForm<ContactsSchemaInput>({
        resolver: zodResolver(contactsSchema),
        defaultValues: {
            contact_methods: parsedContacts ?? [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "contact_methods",
    });

    async function onSubmit(data: ContactsSchemaInput) {
        const res = await updateDriverContactsAction(driver.id, data);

        if (res.success) {
            toast.success("Контактите са запазени!");
        } else {
            toast.error("Грешка при запазване.");
        }
    }

    return (
        <div className="p-2 md:p-5">
            <FormBase form={form} onSubmit={onSubmit} submitText="Запазване">
                <div className="space-y-4 w-full">
                    {fields.map((field, index) => (
                        <div
                            key={field.id}
                            className="flex flex-col sm:flex-row gap-2 items-start w-full"
                        >
                            <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full">
                                <div className="flex-1 sm:flex-[0_0_30%] flex flex-col">
                                    <Label
                                        htmlFor={`contact_methods.${index}.type`}
                                        className="mb-2"
                                    >
                                        Тип
                                    </Label>
                                    <Controller
                                        control={form.control}
                                        name={`contact_methods.${index}.type`}
                                        render={({ field }) => (
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                value={field.value}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Изберете тип" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {CONTACT_TYPES.map(
                                                        (type) => (
                                                            <SelectItem
                                                                key={type.value}
                                                                value={
                                                                    type.value
                                                                }
                                                            >
                                                                {type.label}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>

                                <div className="flex-1 flex flex-col">
                                    <FormInput
                                        control={form.control}
                                        name={`contact_methods.${index}.value`}
                                        label="Напишете стойност"
                                        placeholder="Въведете стойност"
                                        className="w-full"
                                    />
                                </div>

                                <div className="flex sm:items-end">
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="xl"
                                        onClick={() => remove(index)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => append({ type: "", value: "" })}
                        className="text-base flex items-center gap-2 w-full sm:w-auto"
                        size={"lg"}
                    >
                        <Plus className="w-4 h-4" />
                        Добави метод за контакт
                    </Button>
                </div>
            </FormBase>
        </div>
    );
}
