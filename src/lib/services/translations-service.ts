import { getDb } from "@/lib/db";
import { languages as allLanguages, LanguageItem } from "../constants";

type TranslationRow = { key: string; value: string };

export type TranslationInfo = {
    count: number;
    languages: LanguageItem[];
};

export class TranslationService {
    private cachedTranslations: Record<string, string> = {};
    private cachedLang: string = "";

    constructor(private db = getDb()) {}

    // -------------------- LOAD ALL --------------------
    async loadTranslations(lang: string) {
        if (
            this.cachedLang === lang &&
            Object.keys(this.cachedTranslations).length
        ) {
            return this.cachedTranslations;
        }

        const [rows] = await this.db.execute(
            `SELECT \`key\`, \`value\` FROM translations WHERE lang = ?`,
            [lang],
        );

        this.cachedTranslations = {};
        for (const row of rows as TranslationRow[]) {
            this.cachedTranslations[row.key] = row.value;
        }
        this.cachedLang = lang;

        return this.cachedTranslations;
    }

    // -------------------- GET / HELPER --------------------
    t(key: string) {
        return this.cachedTranslations[key] ?? key;
    }

    async getTranslation(key: string, lang: string) {
        const [rows] = await this.db.execute(
            `SELECT value FROM translations WHERE \`key\` = ? AND lang = ?`,
            [key, lang],
        );
        return (rows as any[])[0]?.value ?? null;
    }

    // -------------------- CREATE --------------------
    async createTranslation(key: string, value: string, lang: string) {
        const [result] = await this.db.execute(
            `INSERT INTO translations (\`key\`, \`value\`, lang) VALUES (?, ?, ?)`,
            [key, value, lang],
        );
        return result;
    }

    // -------------------- UPDATE --------------------
    async updateTranslation(key: string, lang: string, newValue: string) {
        const [result] = await this.db.execute(
            `UPDATE translations SET \`value\` = ? WHERE \`key\` = ? AND lang = ?`,
            [newValue, key, lang],
        );
        // invalidate cache if needed
        if (this.cachedLang === lang) this.cachedTranslations[key] = newValue;
        return result;
    }

    // -------------------- DELETE --------------------
    async deleteTranslation(key: string, lang: string) {
        const [result] = await this.db.execute(
            `DELETE FROM translations WHERE \`key\` = ? AND lang = ?`,
            [key, lang],
        );
        // remove from cache
        if (this.cachedLang === lang) delete this.cachedTranslations[key];
        return result;
    }

    // -------------------- UPSERT --------------------
    async upsertTranslation(key: string, lang: string, value: string) {
        const [result] = await this.db.execute(
            `INSERT INTO translations (\`key\`, \`value\`, lang)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
            [key, value, lang],
        );
        // update cache
        if (this.cachedLang === lang) this.cachedTranslations[key] = value;
        return result;
    }

    // -------------------- SEARCH --------------------
    async searchTranslations(search: string, lang?: string) {
        const params: any[] = [`%${search}%`];
        let sql = `SELECT \`key\`, \`value\` FROM translations WHERE \`key\` LIKE ?`;
        if (lang) {
            sql += " AND lang = ?";
            params.push(lang);
        }
        const [rows] = await this.db.execute(sql, params);
        return rows as TranslationRow[];
    }

    async getAvailableLanguagesForEntity(
        entityType: string,
        id: string | number,
    ): Promise<TranslationInfo> {
        const keyPattern = `${entityType}_${id}_%`;

        const [rows] = await this.db.execute(
            `SELECT DISTINCT lang FROM translations WHERE \`key\` LIKE ?`,
            [keyPattern],
        );

        const codesInDb = (rows as { lang: string }[]).map((row) => row.lang);

        const availableLanguages = allLanguages.filter((lang) =>
            codesInDb.includes(lang.code),
        );

        return {
            count: availableLanguages.length,
            languages: availableLanguages,
        };
    }

    async getEntityTranslations(
        entityType: string,
        id: string | number,
        fields: { value: string; label: string; type: string }[],
    ): Promise<Record<string, any>> {
        const keyPattern = `${entityType}_${id}_%`;

        const [rows]: any = await this.db.execute(
            `SELECT lang, \`key\`, value FROM translations WHERE \`key\` LIKE ?`,
            [keyPattern],
        );

        const result: Record<string, any> = {};

        // Группираме по език
        rows.forEach((row: any) => {
            if (!result[row.lang]) {
                result[row.lang] = {};
            }

            // Намираме съответното поле от масива fields, за да вземем типа и етикета
            const fieldKey = row.key.replace(`${entityType}_${id}_`, "");
            const fieldConfig = fields.find((f) => f.value === fieldKey);

            // Връщаме същата структура като в response-а от превода
            result[row.lang][row.key] = {
                value: row.value,
                type: fieldConfig?.type || "text",
                label: fieldConfig?.label || fieldKey,
            };
        });

        return result;
    }

    async deleteEntityTranslations(
        entityType: string,
        id: string | number,
        lang?: string,
    ): Promise<void> {
        const keyPattern = `${entityType}_${id}_%`;

        if (lang) {
            await this.db.execute(
                `DELETE FROM translations WHERE \`key\` LIKE ? AND lang = ?`,
                [keyPattern, lang],
            );
        } else {
            await this.db.execute(
                `DELETE FROM translations WHERE \`key\` LIKE ?`,
                [keyPattern],
            );
        }
    }
}
