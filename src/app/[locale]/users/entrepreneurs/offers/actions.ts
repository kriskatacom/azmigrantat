"use server";

import { revalidatePath } from "next/cache";
import { OfferService } from "@/lib/services/offer-service";
import { CreateOfferFormValues } from "@/app/[locale]/users/entrepreneurs/offers/[id]/schema";
import { deleteUploadedFile } from "@/app/api/lib";
import { UserService } from "@/lib/services/user-service";

const offerService = new OfferService();
const userService = new UserService();

export async function createOfferAction(values: CreateOfferFormValues) {
    try {
        const user = await userService.getCurrentUser();

        if (!user) {
            throw new Error("Няма потребител");
        }

        const offer = await offerService.create(user.id, values);

        revalidatePath("/users/entrepreneurs/companies/ads");
        
        return {
            success: true,
            message: "Обявата беше създадена успешно!",
            offer,
        };
    } catch (err: any) {
        console.error(err);
        return {
            success: false,
            message: err.message || "Грешка при създаване на обява",
        };
    }
}

export async function updateOfferAction(id: number, values: CreateOfferFormValues) {
    try {
        const offer = await offerService.update(id, values);
        revalidatePath("/users/entrepreneurs/companies/offers");
        return {
            success: true,
            message: "Обявата беше редактирана успешно!",
            offer,
        };
    } catch (err: any) {
        console.error(err);
        return {
            success: false,
            message: err.message || "Грешка при редактиране на обява",
        };
    }
}

export async function deleteOfferAction(id: number) {
    try {
        const offer = await offerService.getOfferByColumn("id", id);

        if (!offer) {
            return {
                success: false,
                message: "Тази обява не беше намерена.",
            };
        }
        
        await offerService.delete(id);

        if (offer.image) {
            await deleteUploadedFile(offer.image);
        }

        revalidatePath("/users/entrepreneurs/offers");
        
        return {
            success: true,
            message: "Обявата беше изтрита успешно!",
        };
    } catch (err: any) {
        console.error(err);
        return {
            success: false,
            message: err.message || "Грешка при изтриване на обява",
        };
    }
}