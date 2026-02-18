import translate from "google-translate-api-x";
import fs from "fs";
import path from "path";
import chalk from "chalk";

interface TranslationResult {
    [langCode: string]: {
        [originalText: string]: string;
    };
}

/**
 * Превежда масив от текстове на множество езици и записва резултата в JSON
 */
async function translateAndSave(
    texts: string[],
    languages: string[],
    outputFile: string = "translations.json",
): Promise<void> {
    const finalTranslations: TranslationResult = {};
    const separator = " ||| "; // Уникален разделител

    console.log(chalk.bold.cyan(`\n🚀 Стартиране на масов превод...`));
    console.log(chalk.gray(`Текстове за превод: ${texts.length}`));
    console.log(chalk.gray(`Целеви езици: ${languages.length}\n`));

    // Съединяваме текстовете в един блок за оптимизация на заявките
    const combinedText = texts.join(separator);

    for (const lang of languages) {
        try {
            process.stdout.write(
                chalk.yellow(`🌍 Превеждане на [${lang.toUpperCase()}]... `),
            );

            const res = await translate(combinedText, { to: lang });

            // Разделяме преведения текст обратно на части
            const translatedParts = res.text
                .split(separator)
                .map((t) => t.trim());

            finalTranslations[lang] = {};
            texts.forEach((original, index) => {
                finalTranslations[lang][original] =
                    translatedParts[index] || "";
            });

            console.log(chalk.green("✅ Готово"));
        } catch (error: any) {
            console.log(
                chalk.red(`❌ Грешка при език ${lang}: ${error.message}`),
            );
            finalTranslations[lang] = { error: "Failed to translate" };
        }
    }

    // Записване във файл
    try {
        const dir = path.dirname(outputFile);
        if (!fs.existsSync(dir) && dir !== ".") {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(
            outputFile,
            JSON.stringify(finalTranslations, null, 4),
            "utf-8",
        );
        console.log(
            chalk.bold.green(
                `\n✨ Файлът е генериран успешно: ${path.resolve(outputFile)}`,
            ),
        );
    } catch (err: any) {
        console.error(chalk.red(`\nГрешка при запис на файла: ${err.message}`));
    }
}
