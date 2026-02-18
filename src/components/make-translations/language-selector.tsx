"use client";

import { useLanguageStore } from "@/stores/languages-store";

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { languages } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import AppImage from "@/components/AppImage";
import { Check } from "lucide-react";

export function LanguageSelector() {
    const {
        isSidebarOpen,
        selectedLanguages,
        toggleLanguage,
        isSelected,
        isAlreadyTranslated,
        closeSidebar,
        toggleAll,
    } = useLanguageStore((state) => state);

    return (
        <Sheet open={isSidebarOpen} onOpenChange={closeSidebar}>
            <SheetContent
                side="left"
                className="w-100 sm:w-125 overflow-auto"
                style={{ zIndex: 999 }}
            >
                <SheetHeader className="px-5">
                    <SheetTitle className="text-2xl font-semibold mb-2">
                        Избиране на езици{" "}
                        {selectedLanguages.length > 0
                            ? `(${selectedLanguages.length})`
                            : null}
                    </SheetTitle>
                    <SheetDescription>
                        Моля, изберете езиците, на които желаете да бъде
                        преведена информацията.
                    </SheetDescription>
                </SheetHeader>

                <div className="px-5">
                    <Button
                        variant={"default"}
                        size={"xl"}
                        className="text-left w-full"
                        onClick={toggleAll}
                    >
                        Избиране на всички езици
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 px-5 mb-5">
                    {languages.map((lang) => {
                        const active = isSelected(lang);

                        return (
                            <div key={lang.code} className="relative">
                                <Button
                                    type="button"
                                    variant={active ? "default" : "outline"}
                                    size="xl"
                                    onClick={() => toggleLanguage(lang)}
                                    className={`
                                    w-full justify-start gap-3 transition-all
                                    ${active ? "ring-2 ring-primary" : ""}
                                `}
                                    disabled={isAlreadyTranslated(lang.code)}
                                >
                                    <div className="w-6 shrink-0">
                                        <AppImage
                                            src={`/images/flags/${lang.flag}.webp`}
                                            alt={`${lang.name} flag`}
                                            className="object-cover"
                                            width={24}
                                            height={24}
                                        />
                                    </div>
                                    <span className="truncate">
                                        {lang.name}
                                    </span>
                                </Button>
                                {isAlreadyTranslated(lang.code) && (
                                    <div className="absolute top-0 right-0 rounded-sm text-green-600 text-xs p-1">
                                        <Check />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </SheetContent>
        </Sheet>
    );
}
