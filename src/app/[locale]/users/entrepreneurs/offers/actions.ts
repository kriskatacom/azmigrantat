"use server";

import { revalidatePath } from "next/cache";
import { OfferService } from "@/lib/services/offer-service";
import { CreateOfferFormValues } from "@/app/[locale]/users/entrepreneurs/offers/[id]/schema";
import { deleteUploadedFile } from "@/app/api/lib";

const offerService = new OfferService();

export async function createOfferAction(values: CreateOfferFormValues) {
    try {
        const offer = await offerService.create(values);
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