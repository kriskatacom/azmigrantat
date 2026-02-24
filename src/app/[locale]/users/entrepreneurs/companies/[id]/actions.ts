"use server";

import { revalidatePath } from "next/cache";
import { CreateCompanyFormValues } from "./schema";
import { updateCompany } from "@/lib/services/companies-service";

export async function updateCompanyAction(
    id: number,
    values: CreateCompanyFormValues,
) {
    try {
        const company = await updateCompany(id, values);
        revalidatePath("/users/entrepreneurs/companies/companies");
        return {
            success: true,
            message: "Компанията беше редактирана успешно!",
            company,
        };
    } catch (err: any) {
        console.error(err);
        return {
            success: false,
            message: err.message || "Грешка при редактиране на компания",
        };
    }
}
