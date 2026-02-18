import { create } from "zustand";
import { LanguageItem, languages } from "@/lib/constants";
import { TranslationField } from "@/components/make-translations";

// const testTranslationResults: Record<string, Record<string, TranslationField>> = {
//     "en": {
//         "landmark_1_name": {
//             "value": "Rila Monastery",
//             "type": "text",
//             "label": "Име"
//         },
//         "landmark_1_heading": {
//             "value": "The spiritual heart of Bulgaria",
//             "type": "text",
//             "label": "Заглавие"
//         },
//         "landmark_1_description": {
//             "value": "The monastery was founded in the 10th century by Saint John of Rila.",
//             "type": "textarea",
//             "label": "Кратко описание"
//         },
//         "landmark_1_content": {
//             "value": "<h2>History</h2><p>The Rila Monastery is the largest and most famous Eastern Orthodox monastery in Bulgaria...</p>",
//             "type": "wysiwyg",
//             "label": "Подробно съдържание"
//         }
//     },
//     "de": {
//         "landmark_1_name": {
//             "value": "Rila-Kloster",
//             "type": "text",
//             "label": "Име"
//         },
//         "landmark_1_heading": {
//             "value": "Das spirituelle Herz Bulgariens",
//             "type": "text",
//             "label": "Заглавие"
//         },
//         "landmark_1_description": {
//             "value": "Das Kloster wurde im 10. Jahrhundert vom heiligen Johannes von Rila gegründet.",
//             "type": "textarea",
//             "label": "Кратко описание"
//         },
//         "landmark_1_content": {
//             "value": "<h2>Geschichte</h2><p>Das Rila-Kloster ist das größte und bekannteste orthodoxe Kloster in Bulgarien...</p>",
//             "type": "wysiwyg",
//             "label": "Подробно съдържание"
//         }
//     }
// };

export interface TranslationInfo {
    count: number;
    languages: LanguageItem[];
}

interface LanguageState {
    // ДАННИ ЗА ОБЕКТА
    entityType: string | null;
    entityId: string | number | null;
    setEntity: (type: string, id: string | number) => void;

    selectedLanguages: LanguageItem[];
    toggleLanguage: (lang: LanguageItem) => void;
    isSelected: (lang: LanguageItem) => boolean;
    clearAll: () => void;
    toggleAll: () => void;

    // Sidebar
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    openSidebar: () => void;
    closeSidebar: () => void;

    // Резултати от превод (Локално състояние за редакция)
    translationResults: Record<string, Record<string, TranslationField>> | null;
    setTranslationResults: (
        results: Record<string, Record<string, TranslationField>> | null,
    ) => void;

    translationInfo: TranslationInfo;
    setTranslationInfo: (info: TranslationInfo) => void;

    isAlreadyTranslated: (langCode: string) => boolean;

    isResultsDialogOpen: boolean;
    setResultsDialogOpen: (open: boolean) => void;

    selectedTab: string | null;
    setSelectedTab: (tab: string | null) => void;

    fields: TranslationField[];
    setFields: (fields: TranslationField[]) => void;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
    // Инициализация на обекта
    entityType: null,
    entityId: null,
    fields: [],
    setEntity: (type, id) => set({ entityType: type, entityId: id }),
    setFields: (fields) => set({ fields }),

    selectedLanguages: [],
    toggleLanguage: (lang) => {
        const isAlready = get().selectedLanguages.some(
            (l) => l.code === lang.code,
        );
        set({
            selectedLanguages: isAlready
                ? get().selectedLanguages.filter((l) => l.code !== lang.code)
                : [...get().selectedLanguages, lang],
        });
    },
    isSelected: (lang) =>
        get().selectedLanguages.some((l) => l.code === lang.code),
    clearAll: () => set({ selectedLanguages: [] }),
    toggleAll: () => {
        const { selectedLanguages, translationInfo } = get();

        const translatedCodes = translationInfo.languages.map((l) => l.code);

        const availableLanguages = languages.filter(
            (lang) => !translatedCodes.includes(lang.code),
        );

        const allAvailableSelected =
            selectedLanguages.length === availableLanguages.length;

        set({
            selectedLanguages: allAvailableSelected
                ? []
                : [...availableLanguages],
        });
    },

    isSidebarOpen: false,
    toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    openSidebar: () => set({ isSidebarOpen: true }),
    closeSidebar: () => set({ isSidebarOpen: false }),

    translationResults: null,
    setTranslationResults: (results) => {
        set({ translationResults: results });
        if (results) {
            const keys = Object.keys(results);
            if (keys.length > 0) {
                set({ selectedTab: keys[0] });
            }
        }
    },

    translationInfo: { count: 0, languages: [] },
    setTranslationInfo: (info) => set({ translationInfo: info }),

    isAlreadyTranslated: (langCode: string) => {
        return get().translationInfo.languages.some(
            (lang) => lang.code === langCode,
        );
    },

    isResultsDialogOpen: false,
    setResultsDialogOpen: (open) => set({ isResultsDialogOpen: open }),

    selectedTab: "bg",
    setSelectedTab: (tab) => set({ selectedTab: tab }),
}));
