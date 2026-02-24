import * as z from "zod";

export const createCompanySchema = z.object({
    facebook_page_link: z.string(),
});

export type CreateCompanyFormValues = z.infer<typeof createCompanySchema>;