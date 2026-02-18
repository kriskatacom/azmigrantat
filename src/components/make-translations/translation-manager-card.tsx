"use client";

import { Globe, Plus, SaveAllIcon, Loader2, Trash2 } from "lucide-react";
import { FaTimes } from "react-icons/fa";
import { toast } from "sonner";
import { useState } from "react";
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
import {
    deleteTranslationsAction,
    getExistingTranslationsAction,
} from "@/components/make-translations/actions";

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

    const handleDeleteLanguage = async (code: string) => {
        const res = await deleteTranslationsAction(
            entityType!,
            entityId!,
            code,
        );
        if (res.success) {
            toast.success(res.message);
            setSelectedTab(null);
            setResultsDialogOpen(false);
            setTranslationResults(null);
        } else {
            toast.error(res.error);
        }
    };

    const handleDeleteAll = async () => {
        if (
            !confirm(
                "Сигурни ли сте, че искате да изтриете ВСИЧКИ преводи за този обект?",
            )
        )
            return;

        try {
            const res = await deleteTranslationsAction(entityType!, entityId!);
            if (res.success) {
                toast.success("Всички преводи бяха премахнати.");
                setSelectedTab(null);
                setResultsDialogOpen(false);
                setTranslationResults(null);
            } else {
                toast.error(res.error);
            }
        } catch (err) {
            toast.error("Възникна грешка при масовото изтриване.");
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
                    {(translationInfo.languages.length > 0 && (
                        <>
                            <button
                                onClick={handleDeleteAll}
                                className="text-[10px] text-red-500 hover:text-red-600 font-semibold flex items-center gap-1 transition-colors px-2 py-1 rounded bg-red-50 hover:bg-red-10"
                            >
                                <Trash2 className="w-3 h-3" />
                                Изтрий всички
                            </button>
                            <div className="flex gap-2 flex-wrap mt-1">
                                {translationInfo.languages.map((lang) => {
                                    const isLoading = isFetching === lang.code;

                                    return (
                                        <div
                                            key={lang.code}
                                            className="relative group"
                                        >
                                            <button
                                                disabled={!!isFetching}
                                                onClick={() =>
                                                    handleOpenDialog(lang.code)
                                                }
                                                className={`
                                            relative flex items-center justify-center w-10 h-7 
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

                                                {/* SPINNER */}
                                                {isLoading && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                                    </div>
                                                )}

                                                {/* TOOLTIP */}
                                                {!isLoading && (
                                                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none">
                                                        {lang.name}
                                                    </div>
                                                )}
                                            </button>

                                            {/* БУТОН ЗА ИЗТРИВАНЕ (X) */}
                                            {!isLoading && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (
                                                            confirm(
                                                                `Изтриване на превода за ${lang.name}?`,
                                                            )
                                                        ) {
                                                            handleDeleteLanguage(
                                                                lang.code,
                                                            );
                                                        }
                                                    }}
                                                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 
                                                        opacity-0 group-hover:opacity-100 hover:bg-red-600 
                                                        transition-all duration-200 shadow-sm z-60"
                                                >
                                                    <FaTimes className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )) || (
                        <span className="text-sm text-slate-400 w-full italic">
                            Няма създадени преводи
                        </span>
                    )}
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