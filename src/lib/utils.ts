import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Location } from "./types";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const websiteName = (prefix: string = "") => {
    const websiteName = "Аз Мигрантът";
    return prefix ? `${prefix} - ${websiteName}` : websiteName;
};

export const extractIframeSrc = (iframeHtml: string): string | null => {
    if (!iframeHtml) return null;

    const match = iframeHtml.match(/src\s*=\s*["']([^"']+)["']/i);

    return match ? match[1] : null;
};

export function absoluteUrl(path?: string | null) {
    if (!path) return undefined;

    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    const baseUrl = process.env.SITE_URL || "";
    return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function googleMapsLinkToDirections(
    googleMapsUrl: string,
    origin: Location,
): string {
    let destinationLatLng: string | null = null;

    // 1️⃣ Опит: @lat,lng
    const atMatch = googleMapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
        destinationLatLng = `${atMatch[1]},${atMatch[2]}`;
    }

    // 2️⃣ Опит: !3dLAT!4dLNG
    if (!destinationLatLng) {
        const bangMatch = googleMapsUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        if (bangMatch) {
            destinationLatLng = `${bangMatch[1]},${bangMatch[2]}`;
        }
    }

    if (!destinationLatLng) {
        throw new Error("Не можах да извлека координати от Google Maps линка");
    }

    const originParam = `${origin.lat},${origin.lng}`;

    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        originParam,
    )}&destination=${encodeURIComponent(destinationLatLng)}`;
}

export function slugify(text: string): string {
    const map: Record<string, string> = {
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
        ь: "",
        ю: "yu",
        я: "ya",
    };

    return text
        .toLowerCase()
        .split("")
        .map((char) => map[char] ?? char)
        .join("")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

// navigator.geolocation.getCurrentPosition((pos) => {
//             const origin = {
//                 lat: pos.coords.latitude,
//                 lng: pos.coords.longitude,
//             };

//             const directionsUrl = googleMapsLinkToDirections(value, origin);

//             setFormData((prev) => ({
//                 ...prev,
//                 your_location: directionsUrl,
//             }));
//         });
