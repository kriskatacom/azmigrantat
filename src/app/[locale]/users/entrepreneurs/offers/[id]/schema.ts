import * as z from "zod";

export const createOfferSchema = z.object({
    name: z.string().min(2, "Името е задължително"),
    heading: z.string().optional(),
    description: z.string().optional(),
    content: z.string().optional(),
    show_name: z.boolean(),
    show_description: z.boolean().optional(),
    show_overlay: z.boolean().optional(),
    show_button: z.boolean().optional(),
    href: z.string().optional(),
    status: z.enum(["active", "draft", "pending", "canceled"]),
    company_id: z.number().int().positive("Моля, изберете компания!").nullable(),
    country_id: z.number().int().positive("Моля, изберете държава!").nullable(),
    city_id: z.number().int().positive("Моля, изберете град!").nullable(),
    category_id: z.number().int().positive("Моля, изберете категория!").nullable(),
});

export type CreateOfferFormValues = z.infer<typeof createOfferSchema>;