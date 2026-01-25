import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
