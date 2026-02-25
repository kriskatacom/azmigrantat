"use client";

import ImageUpload from "@/components/image-upload";
import { Driver } from "@/lib/services/driver-service";

export default function MediaTab({ driver }: { driver: Driver }) {
    return (
        <div className="py-5">
            {/* PROFILE IMAGE */}
            <div className="mb-5 px-5">
                <h2 className="text-xl font-semibold">Профилна снимка</h2>
                <p className="text-muted-foreground">
                    Това изображение ще се показва като ваша профилна снимка в
                    профила и в публичните списъци.
                </p>
            </div>

            <ImageUpload
                image_url={driver.profile_image_url as string}
                url={
                    driver?.id ? `/api/drivers/${driver.id}/profile-upload` : ""
                }
                deleteimage_url={
                    driver?.id ? `/api/drivers/${driver.id}/profile-upload` : ""
                }
            />

            {/* COVER IMAGE */}
            <div className="mb-5 px-5 mt-10">
                <h2 className="text-xl font-semibold">Снимка на корицата</h2>
                <p className="text-muted-foreground">
                    Това изображение ще се използва като корица на вашия профил.
                </p>
            </div>

            <ImageUpload
                image_url={driver.cover_image_url as string}
                url={driver?.id ? `/api/drivers/${driver.id}/upload` : ""}
                deleteimage_url={
                    driver?.id ? `/api/drivers/${driver.id}/upload` : ""
                }
            />
        </div>
    );
}
