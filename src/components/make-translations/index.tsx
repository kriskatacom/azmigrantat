"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLanguageStore } from "@/stores/languages-store";
import { LanguageSelector } from "@/components/make-translations/language-selector";
import { translateTextsAction } from "@/components/make-translations/actions";
import { TranslationResultsDialog } from "@/components/make-translations/translation-results-dialog";
import { TranslationInfo } from "@/lib/services/translations-service";
import { TranslationManagerCard } from "@/components/make-translations/translation-manager-card";

export interface TranslationField {
    value: string;
    type: "text" | "textarea" | "wysiwyg";
    label: string;
}

type MakeTranslationsProps = {
    entityType: string;
    entityId: string | number;
    translationInfo: TranslationInfo;
    fields: TranslationField[];
    textsToTranslate: string[];
};

export default function MakeTranslations({
    entityType,
    entityId,
    translationInfo,
    textsToTranslate,
    fields,
}: MakeTranslationsProps) {
    const [isTranslating, setIsTranslating] = useState(false);
    const {
        selectedLanguages,
        setTranslationInfo,
        setTranslationResults,
        setResultsDialogOpen,
        setEntity,
        setFields,
        clearAll,
    } = useLanguageStore();
    const [progress, setProgress] = useState(0);
    const [buttonMessage, setButtonMessage] = useState<string | null>(null);

    useEffect(() => {
        setEntity(entityType, entityId);
        setFields(fields);
        setTranslationInfo(translationInfo);
    }, [entityType, entityId, translationInfo]);

    const handleApplyLanguages = async () => {
        if (selectedLanguages.length === 0) return;

        setIsTranslating(true);
        setProgress(0);
        const total = selectedLanguages.length;
        const formattedResults: any = {};
        let successCount = 0;

        try {
            for (let i = 0; i < total; i++) {
                const lang = selectedLanguages[i];

                const remainingFields = total - i;
                const estimatedSeconds = Math.ceil(remainingFields * 1.5);
                const timeMessage =
                    estimatedSeconds > 60
                        ? `${Math.floor(estimatedSeconds / 60)} мин. и ${estimatedSeconds % 60} сек.`
                        : `${estimatedSeconds} сек.`;

                setButtonMessage(
                    `Превеждане на ${lang.name}... (остават ~${timeMessage})`,
                );

                const response = await translateTextsAction(textsToTranslate, [
                    lang.code,
                ]);

                if (response.success && response.data?.[lang.code]) {
                    const translationsArray = response.data[lang.code];
                    formattedResults[lang.code] = {};
                    successCount++;

                    fields.forEach((field, index) => {
                        const fullKey = `${entityType}_${entityId}_${field.value}`;
                        formattedResults[lang.code][fullKey] = {
                            value: translationsArray[index] || "",
                            type: field.type,
                            label: field.label,
                        };
                    });
                }

                setProgress(Math.round(((i + 1) / total) * 100));

                if (i < total - 1) {
                    await new Promise((r) => setTimeout(r, 600));
                }
            }

            if (successCount > 0) {
                setButtonMessage("Преводът завърши успешно!");
                setTranslationResults(formattedResults);
                await new Promise((r) => setTimeout(r, 1000));
                setResultsDialogOpen(true);
                clearAll();
            } else {
                toast.error("Нито един език не беше преведен успешно.");
            }
        } catch (error) {
            toast.error("Възникна грешка по време на превода.");
            console.error(error);
        } finally {
            setIsTranslating(false);
            setButtonMessage(null);
            setTimeout(() => setProgress(0), 500);
        }
    };

    return (
        <>
            <TranslationManagerCard
                loading={isTranslating}
                onApply={handleApplyLanguages}
                buttonMessage={buttonMessage}
                progress={progress}
            />
            <LanguageSelector />
            <TranslationResultsDialog />
        </>
    );
}
