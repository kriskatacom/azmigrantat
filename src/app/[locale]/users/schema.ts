import * as z from "zod";

export const loginSchema = z.object({
    email: z.string().email("Невалиден email"),
    password: z.string().min(6, "Паролата трябва да е поне 6 символа"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;




export const registerSchema = z.object({
    name: z.string().min(2, "Името трябва да е поне 2 символа"),
    email: z.string().email("Невалиден email"),
    password: z.string().min(6, "Паролата трябва да е поне 6 символа"),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
