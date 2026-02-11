"use server";

import { cookies } from "next/headers";

// Generic session type
export type SessionData = Record<string, any>;

export async function saveSession(cookieName: string, data: SessionData) {
    const cookieStore = await cookies();

    cookieStore.set(cookieName, JSON.stringify(data), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 1 ден
    });
}

export async function getSession<T = SessionData>(
    cookieName: string,
): Promise<T | undefined> {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(cookieName);
    if (!cookie) return undefined;

    try {
        return JSON.parse(cookie.value) as T;
    } catch {
        return undefined;
    }
}

export async function clearSession(cookieName: string) {
    const cookieStore = await cookies();

    cookieStore.delete({
        name: cookieName,
        path: "/", // опция
    });
}
