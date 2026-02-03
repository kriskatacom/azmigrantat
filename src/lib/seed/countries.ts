import fs from "fs/promises";
import axios from "axios";
import { load } from "cheerio";
import path from "path";
import { getTodayFolder, sleep } from "@/app/api/lib";
import { downloadImage } from "@/app/api/lib";
import { createCountry } from "@/lib/services/country-service";
import { COUNTRIES, COUNTRY_ELEMENTS } from "@/lib/constants";

type CountryItem = {
    name: string;
    slug: string;
    image_url: string;
    link: string;
    boxes: BoxItem[];
};

type BoxItem = {
    name: string;
    slug: string;
    image: string;
};

export async function seedCountriesAndElements() {
    const html = await fs.readFile("src/lib/html/countries.html", "utf-8");
    const countriesWithElements = await scrapeCountriesFromHtml(html);

    if (countriesWithElements.length === 0) {
        console.log("Няма намерени държави");
        return;
    }

    for (const country of countriesWithElements) {
        const createdCountry = await createCountry({
            name: country.name,
            slug: country.slug as string,
            image_url: country.image_url,
            id: 0,
        });
    }
}

export async function scrapeCountriesFromHtml(
    html: string,
    uploadsDir = "public/uploads"
): Promise<CountryItem[]> {
    const $ = load(html);
    const countries: CountryItem[] = [];

    const countryElements = $(
        "#cities-wrapper a.block.relative.group"
    ).toArray();

    for (const el of countryElements) {
        const name = $(el).find("h3").text().trim();
        const link = $(el).attr("href");
        const imageUrl = $(el).find("img").attr("src");

        if (!name || !link || !imageUrl) continue;

        const slug = COUNTRIES[name];
        const { folder, year, month, day } = await getTodayFolder(uploadsDir);

        const ext = path.extname(imageUrl).split("?")[0] || ".webp";
        const filename = `${slug}${ext}`;
        const filepath = path.join(folder, filename);

        await downloadImage(imageUrl, filepath);

        const boxes = await scrapeBoxes(link, uploadsDir, COUNTRIES[name]);

        countries.push({
            name,
            slug,
            image_url: `/uploads/${year}/${month}/${day}/${filename}`,
            link,
            boxes,
        });
    }

    return countries;
}

export async function scrapeBoxes(
    url: string,
    baseDir = "public/uploads",
    countrySlug: string
): Promise<BoxItem[]> {
    await sleep(500);

    let html: string;
    try {
        const res = await axios.get(url, {
            headers: { "User-Agent": "Mozilla/5.0" },
            timeout: 15000,
        });
        html = res.data;
    } catch (err: any) {
        console.error(`❌ Failed to fetch country page: ${url}`);
        throw err;
    }

    const $ = load(html);
    const items: BoxItem[] = [];
    const downloads: Promise<void>[] = [];
    const { folder, year, month, day } = await getTodayFolder(baseDir);

    $("a.block.relative.group").each((_, el) => {
        const title = $(el).find("h3").text().trim();
        const imgSrc = $(el).find("img").attr("src");

        if (!title || !imgSrc) return;

        const elementSlug = COUNTRY_ELEMENTS[title];
        if (!elementSlug) {
            console.warn(`⚠️ Unknown element title: "${title}"`);
            return;
        }

        const ext = path.extname(imgSrc).split("?")[0] || ".webp";
        const filename = `${countrySlug}-${elementSlug}${ext}`;
        const filepath = path.join(folder, filename);

        items.push({
            name: title,
            slug: elementSlug,
            image: `/uploads/${year}/${month}/${day}/${filename}`,
        });

        downloads.push(downloadImage(imgSrc, filepath));
    });

    await Promise.all(downloads);

    return items;
}
