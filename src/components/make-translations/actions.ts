"use server";

import { TranslationService } from "@/lib/services/translations-service";
import translate from "google-translate-api-x";
import { revalidatePath } from "next/cache";
import { TranslationField } from ".";

export interface TranslationResponse {
    success: boolean;
    data?: Record<string, Record<string, string>>;
    error?: string;
}

export async function translateTextsAction(
    texts: string[],
    languages: string[],
): Promise<{
    success: boolean;
    data?: Record<string, string[]>;
    error?: string;
}> {
    try {
        const finalTranslations: Record<string, string[]> = {};
        const separator = " [SEP] ";

        const cleanTexts = texts.map((t) => (t?.trim() === "" ? "---" : t));
        const combinedText = cleanTexts.join(separator);

        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

        for (let i = 0; i < languages.length; i++) {
            const lang = languages[i];
            if (i > 0) await sleep(800);

            const res = await translate(combinedText, { to: lang });

            const translatedParts = res.text
                .split(/\[SEP\]|\|\|\|/i)
                .map((t) => t.trim().replace(/^---$/, ""));

            finalTranslations[lang] = cleanTexts.map(
                (_, idx) => translatedParts[idx] || cleanTexts[idx],
            );
        }

        return { success: true, data: finalTranslations };
    } catch (error: any) {
        console.error("Translation Error:", error);
        return { success: false, error: "Грешка при превода." };
    }
}

export async function saveTranslationsAction(
    formData: Record<string, Record<string, { value: string }>>,
    entityType: string,
    id: string | number,
) {
    try {
        const service = new TranslationService();

        for (const [lang, fields] of Object.entries(formData)) {
            for (const [key, data] of Object.entries(fields)) {
                await service.upsertTranslation(key, lang, data.value);
            }
        }

        const updatedInfo = await service.getAvailableLanguagesForEntity(
            entityType,
            id,
        );

        revalidatePath("/", "layout");

        return {
            success: true,
            updatedInfo,
        };
    } catch (error) {
        console.error("Failed to save translations:", error);
        return { success: false, error: "Грешка при запис в базата данни." };
    }
}

export async function getExistingTranslationsAction(
    entityType: string,
    id: string | number,
    fields: TranslationField[],
) {
    try {
        const service = new TranslationService();
        const data = await service.getEntityTranslations(
            entityType,
            id,
            fields,
        );
        return { success: true, data };
    } catch (error) {
        return { success: false, error: "Грешка при четене на базата" };
    }
}

export async function deleteTranslationsAction(
    entityType: string,
    id: string | number,
    langCode?: string,
) {
    try {
        const service = new TranslationService();
        await service.deleteEntityTranslations(entityType, id, langCode);

        revalidatePath("/", "layout");

        return {
            success: true,
            message: langCode
                ? `Преводите на език "${langCode}" бяха изтрити.`
                : "Всички преводи бяха премахнати.",
        };
    } catch (error) {
        console.error("Delete translation error:", error);
        return { success: false, error: "Грешка при изтриване на преводите." };
    }
}
