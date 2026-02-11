"use server";

import { redirect } from "next/navigation";
import {
    registerSchema,
    RegisterFormValues,
    loginSchema,
    LoginFormValues,
} from "@/app/[locale]/users/schema";
import { UserRole, UserService } from "@/lib/services/user-service";

const userService = new UserService();

export async function registerAction(data: RegisterFormValues) {
    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) {
        return { error: parsed.error.flatten().fieldErrors };
    }

    const users = await userService.getAllUsers();

    const role: UserRole = users.length === 0 ? "admin" : "user";

    try {
        const data = await userService.signUp({ ...parsed.data, role });
        return { data };
    } catch (err: any) {
        return { error: err.message || "Създаването не беше успешно!" };
    }
}

export async function loginAction(data: LoginFormValues) {
    const parsed = loginSchema.safeParse(data);
    if (!parsed.success) {
        return { error: parsed.error.flatten().fieldErrors };
    }

    try {
        const data = await userService.signIn(parsed.data);
        return { data };
    } catch (err: any) {
        return { error: err.message || "Невалидни данни за вход" };
    }
}

export async function logoutAction() {
    await userService.signOut();
    redirect("/users/login");
}
