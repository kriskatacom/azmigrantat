import * as z from "zod";

export const createOfferSchema = z.object({
    name: z.string().min(2, "Името е задължително"),
    heading: z.string().optional(),
    description: z.string().optional(),
    content: z.string().optional(),
    status: z.enum(["active", "draft", "pending", "canceled"]),
    company_id: z.number().int().positive("Company ID трябва да е положително число").nullable(),
});

export type CreateOfferFormValues = z.infer<typeof createOfferSchema>;