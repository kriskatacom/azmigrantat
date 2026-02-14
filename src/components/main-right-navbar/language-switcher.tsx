"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { CiGlobe } from "react-icons/ci";
import { iconLargeSize } from "@/lib/constants";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages = [
    { code: "bg", name: "Български", flag: "🇧🇬" },
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "nl", name: "Nederlands", flag: "🇳🇱" }
];

export default function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const switchLocale = (newLocale: string) => {
        startTransition(() => {
            router.push(pathname, { locale: newLocale });
            setTimeout(() => changeLanguage(newLocale), 500);
        });
    };

    const changeLanguage = (lang: string) => {
        document.cookie = `googtrans=/bg/${lang};path=/`;
        window.location.reload();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="p-3 rounded-md hover:bg-primary cursor-pointer duration-300">
                    <CiGlobe size={iconLargeSize} className="text-light" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => switchLocale(lang.code)}
                        className={locale === lang.code ? "bg-accent" : ""}
                    >
                        <span className="mr-2">{lang.flag}</span>
                        {lang.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
