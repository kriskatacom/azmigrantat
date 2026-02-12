"use server";

import { revalidatePath } from "next/cache";
import { updateCompany } from "@/lib/services/companies-service";
import { User, UserService } from "@/lib/services/user-service";

const userService = new UserService();

export async function fetchUsersAction(): Promise<User[]> {
    return await userService.getAllUsers();
}

export async function assignUserToCompany(companyId: number, userId: string) {
    try {
        const companyUpdated = await updateCompany(companyId, {
            user_id: userId,
        });

        revalidatePath("/admin/companies");
        return companyUpdated;
    } catch (err) {
        console.error("Грешка при назначаване на потребител:", err);
        throw new Error("Неуспешно назначаване на потребител.");
    }
}

export async function removeUserFromCompany(companyId: number) {
    try {
        const companyUpdated = await updateCompany(companyId, {
            user_id: null,
        });

        revalidatePath("/admin/companies");
        return companyUpdated;
    } catch (err) {
        console.error("Грешка при премахване на потребител:", err);
        throw new Error("Неуспешно премахване на потребител.");
    }
}
