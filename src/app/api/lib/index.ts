import path from "path";
import { load } from "cheerio";
import axios from "axios";
import fsPromises from "fs/promises";
import fs from "fs";
import fsSync from "fs";

export function validatePassword(password: string) {
    const re =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]).{8,}$/;
    return re.test(password);
}

export function generateSlug(name: string) {
    const cyrillicToLatinMap: Record<string, string> = {
        а: "a",
        б: "b",
        в: "v",
        г: "g",
        д: "d",
        е: "e",
        ж: "zh",
        з: "z",
        и: "i",
        й: "y",
        к: "k",
        л: "l",
        м: "m",
        н: "n",
        о: "o",
        п: "p",
        р: "r",
        с: "s",
        т: "t",
        у: "u",
        ф: "f",
        х: "h",
        ц: "ts",
        ч: "ch",
        ш: "sh",
        щ: "sht",
        ъ: "a",
        ь: "i",
        ю: "yu",
        я: "ya",
        ё: "yo",
        э: "e",
    };

    const transliterated = name
        .toLowerCase()
        .split("")
        .map((char) => cyrillicToLatinMap[char] ?? char)
        .join("");

    return transliterated
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/--+/g, "-");
}

export async function saveUploadedFile(
    file: File, 
    byDate: boolean = true, 
    customFileName?: string // Добавяме параметър за желано име
) {
    if (!file) throw new Error("Няма файл");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let uploadDir = path.join(process.cwd(), "public/uploads");

    if (byDate) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");

        uploadDir = path.join(uploadDir, year.toString(), month, day);
    }

    // Създаваме директорията, ако не съществува
    await fsPromises.mkdir(uploadDir, { recursive: true });

    // Определяме базовото име и разширението
    // Ако има customFileName, използваме него. Ако не, взимаме името на самия файл.
    const originalName = customFileName || file.name;
    const ext = path.extname(originalName);
    const baseName = path.parse(originalName).name;

    let fileName = `${baseName}${ext}`;
    let filePath = path.join(uploadDir, fileName);

    // 👇 Проверка за съществуващ файл и добавяне на инкрементален суфикс
    let counter = 1;
    while (true) {
        try {
            await fsPromises.access(filePath);
            // Ако файлът съществува (не е хвърлена грешка), променяме името
            fileName = `${baseName}-${counter}${ext}`;
            filePath = path.join(uploadDir, fileName);
            counter++;
        } catch {
            // Ако fsPromises.access хвърли грешка, значи файлът НЕ съществува и името е свободно
            break;
        }
    }

    await fsPromises.writeFile(filePath, buffer);

    // Връщаме URL относително към /public
    const relativePath = path
        .relative(path.join(process.cwd(), "public"), filePath)
        .replace(/\\/g, "/");

    return `/${relativePath}`;
}

export async function deleteUploadedFile(fileUrl: string) {
    if (!fileUrl) return;

    const relativePath = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl;

    const filePath = path.join(process.cwd(), "public", relativePath);

    try {
        await fsPromises.unlink(filePath);
        console.log(`Файлът ${filePath} е изтрит успешно.`);
    } catch (err: any) {
        if (err.code === "ENOENT") {
            console.warn(`Файлът не съществува: ${filePath}`);
        } else {
            console.error(`Грешка при изтриване:`, err);
            throw err;
        }
    }
}

export async function getTodayFolder(baseDir: string) {
    const today = new Date();
    const year = today.getFullYear().toString();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    const folder = path.join(baseDir, year, month, day);
    await fsPromises.mkdir(folder, { recursive: true });

    return { folder, year, month, day };
}

export async function downloadImage(url: string, filepath: string) {
    const response = await axios.get(url, { responseType: "stream" });

    return new Promise<void>((resolve, reject) => {
        const writer = fsSync.createWriteStream(filepath);
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
    });
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function decodeUrlSlug(slug: string): string {
    try {
        return decodeURIComponent(slug);
    } catch (e) {
        console.error("Failed to decode slug:", slug, e);
        return slug;
    }
}
