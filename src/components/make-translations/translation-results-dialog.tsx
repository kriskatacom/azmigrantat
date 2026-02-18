"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Copy, Globe, Loader2, Save } from "lucide-react";
import { FaTimes } from "react-icons/fa";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguageStore } from "@/stores/languages-store";
import { languages } from "@/lib/constants";
import AppImage from "@/components/AppImage";
import { Input } from "@/components/ui/input";
import { TranslationField } from "@/components/make-translations";
import RichTextEditor from "@/components/rich-text-editor";
import { Label } from "@/components/ui/label";
import { saveTranslationsAction } from "@/components/make-translations/actions";

export function TranslationResultsDialog() {
    const {
        translationResults,
        isResultsDialogOpen,
        selectedTab,
        entityType,
        entityId,
        setResultsDialogOpen,
        setSelectedTab,
        setTranslationResults,
        setTranslationInfo,
        clearAll,
    } = useLanguageStore();

    const [formValues, setFormValues] = useState<Record<
        string,
        Record<string, TranslationField>
    > | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isResultsDialogOpen && translationResults) {
            setFormValues(JSON.parse(JSON.stringify(translationResults)));
        }
    }, [isResultsDialogOpen, translationResults]);

    if (!formValues || !translationResults) return null;

    const langCodes = Object.keys(formValues);

    const handleFieldChange = (
        langCode: string,
        fieldKey: string,
        newValue: string,
    ) => {
        setFormValues((prev) => {
            if (!prev) return null;

            const currentLangData = prev[langCode] || {};
            const currentFieldData = currentLangData[fieldKey] || {};

            return {
                ...prev,
                [langCode]: {
                    ...currentLangData,
                    [fieldKey]: {
                        ...currentFieldData,
                        value: newValue,
                    },
                },
            };
        });
    };

    const handleSave = async () => {
        if (!formValues) return;

        // По-добра проверка за ID (за да работи и с 0)
        if (!entityType || entityId === null || entityId === undefined) {
            toast.error("Липсва информация за обекта (Entity Info)!");
            return;
        }

        setIsSaving(true);
        try {
            const result = await saveTranslationsAction(
                formValues,
                entityType,
                entityId,
            );

            if (result.success) {
                if (result.updatedInfo) setTranslationInfo(result.updatedInfo);
                setTranslationResults(formValues);
                toast.success("Промените са запазени успешно!");
                setResultsDialogOpen(false);
                clearAll();
            } else {
                toast.error(result.error || "Възникна грешка при запис.");
            }
        } catch (err) {
            toast.error("Критична грешка при комуникация със сървъра.");
        } finally {
            setIsSaving(false);
        }
    };

    const copyToClipboard = () => {
        if (!formValues) return;

        const cleanResults: Record<string, Record<string, string>> = {};

        Object.entries(formValues).forEach(([lang, fields]) => {
            cleanResults[lang] = {};
            Object.entries(fields).forEach(([key, data]: [string, any]) => {
                cleanResults[lang][key] = data.value;
            });
        });

        navigator.clipboard.writeText(JSON.stringify(cleanResults, null, 2));
        toast.success("Изчистените преводи са копирани!");
    };

    return (
        <Dialog open={isResultsDialogOpen} onOpenChange={setResultsDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-auto">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="text-2xl">
                        Резултати от превода
                    </DialogTitle>
                </DialogHeader>

                <div className="px-5 py-4 border-b bg-slate-50/50">
                    <div className="flex flex-wrap gap-3 justify-start items-center">
                        {Object.keys(formValues).map((langCode) => {
                            const langInfo = languages.find(
                                (l) => l.code === langCode,
                            );
                            const isActive = selectedTab === langCode;

                            return (
                                <button
                                    key={langCode}
                                    onClick={() => setSelectedTab(langCode)}
                                    className={`
                        group relative flex items-center justify-center w-10 h-7 
                        rounded shadow-sm border transition-all duration-200
                        hover:scale-110 active:scale-95
                        ${
                            isActive
                                ? "ring-2 ring-primary ring-offset-2 border-primary shadow-md"
                                : "border-slate-200 bg-white opacity-70 hover:opacity-100"
                        }
                    `}
                                >
                                    <AppImage
                                        src={`/images/flags/${langInfo?.flag || langCode}.webp`}
                                        alt={langInfo?.name || langCode}
                                        className="w-full h-full object-cover rounded"
                                        width={40}
                                        height={28}
                                    />

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 scale-0 group-hover:scale-100 transition-transform bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none">
                                        {langInfo?.name || langCode}
                                    </div>

                                    {/* Индикатор за активно състояние (малка точка под знамето) */}
                                    {isActive && (
                                        <div className="absolute -bottom-1.5 w-1 h-1 bg-primary rounded-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <ScrollArea className="flex-1 bg-slate-100/30">
                    {selectedTab && formValues[selectedTab] ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-5">
                            <div className="px-5 bg-white space-y-5">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <span className="text-sm font-bold uppercase text-slate-500 tracking-wider">
                                        Превод на{" "}
                                        {languages.find(
                                            (l) => l.code === selectedTab,
                                        )?.name || selectedTab}
                                    </span>
                                </div>

                                {Object.entries(formValues[selectedTab]).map(
                                    ([fieldKey, data], idx) => (
                                        <div key={idx} className="space-y-1.5">
                                            <Label className="text-slate-700 font-semibold">
                                                {data.label || fieldKey}
                                            </Label>

                                            {data.type === "wysiwyg" ? (
                                                <div className="rich-text-wrapper border rounded-md bg-white">
                                                    <RichTextEditor
                                                        key={`${selectedTab}-${fieldKey}`}
                                                        content={data.value}
                                                        onChange={(html) =>
                                                            handleFieldChange(
                                                                selectedTab,
                                                                fieldKey,
                                                                html,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            ) : data.type === "textarea" ? (
                                                <Textarea
                                                    key={`${selectedTab}-${fieldKey}`}
                                                    value={data.value}
                                                    onChange={(e) =>
                                                        handleFieldChange(
                                                            selectedTab,
                                                            fieldKey,
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="min-h-40 resize-none border-slate-200 focus-visible:ring-1 bg-slate-50/30 focus:bg-white transition-colors"
                                                    placeholder={`Въведете ${data.label?.toLowerCase() || "текст"}...`}
                                                />
                                            ) : (
                                                <Input
                                                    key={`${selectedTab}-${fieldKey}`}
                                                    value={data.value}
                                                    onChange={(e) =>
                                                        handleFieldChange(
                                                            selectedTab,
                                                            fieldKey,
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="h-10 border-slate-200 focus-visible:ring-1 bg-slate-50/30 focus:bg-white transition-colors"
                                                    placeholder={`Въведете ${data.label?.toLowerCase() || "текст"}...`}
                                                />
                                            )}
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                                <Globe className="w-6 h-6" />
                            </div>
                            <p>Моля, изберете език от списъка по-горе</p>
                        </div>
                    )}
                </ScrollArea>

                <div className="p-4 border-t bg-slate-50 flex items-center justify-between gap-3">
                    <Button
                        variant="outline"
                        className="px-4"
                        onClick={copyToClipboard}
                    >
                        <Copy className="w-5 h-5" /> Копиране на JSON
                    </Button>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setResultsDialogOpen(false)}
                            size={"lg"}
                        >
                            <FaTimes className="w-5 h-5" /> Затваряне
                        </Button>
                        <Button
                            size={"lg"}
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Записване...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Запазване на промените
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}