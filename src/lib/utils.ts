import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const websiteName = (prefix: string) => {
    return `${prefix} - Аз Мигрантът`;
};