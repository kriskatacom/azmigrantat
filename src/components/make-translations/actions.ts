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
): Promise<TranslationResponse> {
    try {
        const finalTranslations: Record<string, Record<string, string>> = {};
        const separator = " ||| ";
        const combinedText = texts.join(separator);

        const sleep = (ms: number) =>
            new Promise((resolve) => setTimeout(resolve, ms));

        for (let i = 0; i < languages.length; i++) {
            const lang = languages[i];

            if (i > 0) {
                await sleep(800);
            }

            const res = await translate(combinedText, { to: lang });

            const translatedParts = res.text
                .split(separator)
                .map((t) => t.trim());

            finalTranslations[lang] = {};
            texts.forEach((original, index) => {
                finalTranslations[lang][original] =
                    translatedParts[index] || original;
            });
        }

        return { success: true, data: finalTranslations };
    } catch (error: any) {
        console.error("Translation Error:", error);
        return {
            success: false,
            error: "Грешка при превода. Моля, опитайте по-късно.",
        };
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
