import * as z from "zod";

export const bannerSchema = z.object({
    name: z
        .string()
        .min(2, "Името трябва да е поне 2 символа")
        .max(50, "Името е твърде дълго"),
    link: z.string().trim().optional(),
    description: z.string().max(1000, "Описанието е твърде дълго").optional(),
    height: z.coerce.number().int().positive().optional(),
    show_name: z.boolean().default(true),
    show_description: z.boolean().default(true),
    show_overlay: z.boolean().default(true),
    content_place: z.enum([
        "top_left",
        "top_right",
        "top_center",
        "center_right",
        "bottom_right",
        "bottom_center",
        "bottom_left",
        "center_left",
        "center_center",
    ]),
    show_button: z.boolean().default(true),
    href: z.string().optional(),
    button_text: z.string().max(20, "Твърде дълъг текст").default("Виж повече"),
    group_key: z.enum(["none", "HOME_ELEMENTS"]).optional(),
});

export type BannerInput = z.input<typeof bannerSchema>;
export type BannerOutput = z.output<typeof bannerSchema>;
export type BannerGroup = BannerInput["group_key"];
