import { Description } from "@/app/[locale]/travel/shared-travel/[driver]/_components/description";
import Gallery from "@/app/[locale]/travel/shared-travel/[driver]/_components/gallery";
import { Driver } from "@/lib/services/driver-service";
import Contacts from "@/app/[locale]/travel/shared-travel/[driver]/_components/contacts";
import ThePost from "@/app/[locale]/travel/shared-travel/[driver]/_components/the-post";

type MainProps = {
    driver: Driver;
};

export default function Main({ driver }: MainProps) {
    let parsedImages: string[] = [];

    if (driver.images) {
        try {
            const result =
                typeof driver.images === "string"
                    ? JSON.parse(driver.images)
                    : driver.images;

            if (Array.isArray(result)) {
                parsedImages = result.filter(Boolean);
            }
        } catch (error) {
            console.error("Invalid driver.images JSON:", error);
        }
    }

    const images: string[] = [
        driver.cover_image_url,
        ...parsedImages,
    ].filter((img): img is string => Boolean(img));

    return (
        <div className="max-w-4xl mx-auto px-2 py-2 md:py-5">
            <div className="grid grid-cols-2 gap-2 md:gap-5">
                <Description driver={driver} />
                <Gallery driver={driver} images={images} />
            </div>
            <Contacts />
            <ThePost />
        </div>
    );
}