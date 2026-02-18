"use client";

import { Globe, Plus, SaveAllIcon, Loader2 } from "lucide-react";
import { FaTimes } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useLanguageStore } from "@/stores/languages-store";
import AppImage from "@/components/AppImage";
import { getExistingTranslationsAction } from "./actions";
import { toast } from "sonner";
import { useState } from "react";

interface TranslationManagerCardProps {
    loading?: boolean;
    buttonMessage?: string | null;
    progress?: number;
    onApply: () => void;
}

export function TranslationManagerCard({
    loading = false,
    buttonMessage,
    progress,
    onApply,
}: TranslationManagerCardProps) {
    const {
        selectedLanguages,
        translationInfo,
        entityType,
        entityId,
        fields,
        toggleLanguage,
        toggleSidebar,
        setResultsDialogOpen,
        setTranslationResults,
        setSelectedTab,
    } = useLanguageStore();

    const [isFetching, setIsFetching] = useState<string | null>(null);
    const langCount = selectedLanguages.length;

    const handleOpenDialog = async (code: string) => {
        if (!entityType || entityId === null || entityId === undefined) {
            toast.error("Липсва информация за обекта!");
            return;
        }

        setIsFetching(code);

        try {
            const response = await getExistingTranslationsAction(
                entityType,
                entityId,
                fields,
            );

            if (response.success && response.data) {
                setTranslationResults(response.data);
                setSelectedTab(code);
                setResultsDialogOpen(true);
            } else {
                toast.error(
                    response.error || "Не бяха открити съществуващи преводи.",
                );
            }
        } catch (error) {
            console.error("Error loading translations:", error);
            toast.error("Грешка при зареждане на преводите.");
        } finally {
            setIsFetching(null);
        }
    };

    return (
        <Card className="mx-5 mt-5 max-w-xl shadow-md border-t-4 border-t-primary shrink-0">
            <CardHeader className="space-x-4 pb-2">
                <div className="flex flex-row items-center gap-5">
                    <div>
                        <Globe className="w-10 h-10 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-xl">Преводи</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Настройте езиците за превод
                        </p>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="text-muted-foreground text-sm font-medium">
                        Приложени преводи
                    </div>
                    <div className="flex gap-2 flex-wrap mt-1">
                        {translationInfo.languages.map((lang) => {
                            const isLoading = isFetching === lang.code;

                            return (
                                <button
                                    key={lang.code}
                                    disabled={!!isFetching} // Блокираме кликове, докато зарежда
                                    onClick={() => handleOpenDialog(lang.code)}
                                    className={`
                        group relative flex items-center justify-center w-10 h-7 
                        rounded shadow-sm border border-slate-200 transition-all
                        ${isLoading ? "opacity-100 scale-105" : "hover:scale-105 active:scale-95 bg-white"}
                        ${isFetching && !isLoading ? "opacity-50" : "opacity-100"}
                    `}
                                >
                                    {/* ФЛАГ */}
                                    <AppImage
                                        src={`/images/flags/${lang.flag}.webp`}
                                        alt={`${lang.name} flag`}
                                        className={`w-full h-full object-cover rounded transition-opacity ${isLoading ? "opacity-20" : "opacity-100"}`}
                                        width={40}
                                        height={28}
                                    />

                                    {/* SPINNER - показва се само при зареждане */}
                                    {isLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                        </div>
                                    )}

                                    {/* TOOLTIP */}
                                    {!isLoading && (
                                        <div className="absolute bottom-10 scale-0 group-hover:scale-100 transition-transform bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none">
                                            {lang.name}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 min-h-12 p-2 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    {langCount > 0 ? (
                        selectedLanguages.map((lang) => (
                            <div
                                key={lang.code}
                                className="group relative flex items-center justify-center w-9 h-7 rounded shadow-sm border border-white cursor-pointer hover:scale-110 transition-transform active:scale-95 bg-white"
                                title={`Премахни ${lang.name}`}
                                onClick={() => toggleLanguage(lang)}
                            >
                                <AppImage
                                    src={`/images/flags/${lang.flag}.webp`}
                                    alt={lang.name}
                                    className="w-full h-full object-cover rounded"
                                    width={36}
                                    height={28}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded transition-opacity flex items-center justify-center">
                                    <span className="text-[10px] text-white font-bold">
                                        <FaTimes />
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <span className="text-sm text-slate-400 flex items-center justify-center w-full italic">
                            Няма избрани езици
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                        {langCount === 1 ? "Избран: " : "Избрани: "}
                        <span className="text-primary font-bold">
                            {langCount} {langCount === 1 ? "език" : "езика"}
                        </span>
                    </p>
                </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
                <div className={`flex w-full gap-2 ${loading && "flex-col"}`}>
                    <Button
                        onClick={toggleSidebar}
                        className="flex-1 py-3"
                        size={"lg"}
                        disabled={loading}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {langCount > 0 ? "Промяна" : "Избиране на езици"}
                    </Button>

                    {langCount > 0 && (
                        <>
                            <Button
                                onClick={onApply}
                                variant="default"
                                className="flex-1 py-3"
                                size={"lg"}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <SaveAllIcon className="w-4 h-4 mr-2" />
                                )}
                                {buttonMessage ? buttonMessage : "Прилагане"}
                            </Button>
                        </>
                    )}
                </div>
                {loading && (
                    <div className="w-full mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in">
                        <div className="flex justify-between items-end mb-2">
                            <div className="space-y-1">
                                <p className="text-base font-medium uppercase tracking-wider">
                                    AI Процес в ход
                                </p>
                                <p className="text-base font-semibold">
                                    {buttonMessage}
                                </p>
                            </div>
                            <span className="text-base font-bold">
                                {progress}%
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-blue-200/50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-600 transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        <p className="mt-2 text-base italic">
                            * Времето е приблизително и зависи от натовареността
                            на API-то.
                        </p>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
