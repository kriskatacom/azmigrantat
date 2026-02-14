import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
    locales: ["bg", "en", "nl"],
    defaultLocale: "bg",
    localePrefix: "as-needed",
});