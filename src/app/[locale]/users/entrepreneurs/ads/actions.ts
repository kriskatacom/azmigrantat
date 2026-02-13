"use server";

import { revalidatePath } from "next/cache";
import { AdService } from "@/lib/services/ad-service";
import { CreateAdFormValues } from "@/app/[locale]/users/entrepreneurs/ads/[id]/schema";
import { deleteUploadedFile } from "@/app/api/lib";
import { UserService } from "@/lib/services/user-service";

const adService = new AdService();
const userService = new UserService();

export async function createAdAction(values: CreateAdFormValues) {
    try {
        const user = await userService.getCurrentUser();

        if (!user) {
            throw new Error("Няма потребител");
        }

        const ad = await adService.create(user.id, values);

        revalidatePath("/users/entrepreneurs/companies/ads");

        return {
            success: true,
            message: "Рекламата беше създадена успешно!",
            ad,
        };
    } catch (err: any) {
        console.error(err);
        return {
            success: false,
            message: err.message || "Грешка при създаване на реклама",
        };
    }
}

export async function updateAdAction(id: number, values: CreateAdFormValues) {
    try {
        const ad = await adService.update(id, values);
        revalidatePath("/users/entrepreneurs/companies/ads");
        return {
            success: true,
            message: "Рекламата беше редактирана успешно!",
            ad,
        };
    } catch (err: any) {
        console.error(err);
        return {
            success: false,
            message: err.message || "Грешка при редактиране на реклама",
        };
    }
}

export async function deleteAdAction(id: number) {
    try {
        const ad = await adService.getAdsByColumn("id", id);

        if (!ad) {
            return {
                success: false,
                message: "Тази реклама не беше намерена.",
            };
        }
        
        await adService.delete(id);

        if (ad.image) {
            await deleteUploadedFile(ad.image);
        }

        revalidatePath("/users/entrepreneurs/ads");
        
        return {
            success: true,
            message: "Рекламата беше изтрита успешно!",
        };
    } catch (err: any) {
        console.error(err);
        return {
            success: false,
            message: err.message || "Грешка при изтриване на реклама",
        };
    }
}