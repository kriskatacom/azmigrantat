import { Description } from "@/app/[locale]/travel/shared-travel/[driver]/_components/description";
import Gallery from "@/app/[locale]/travel/shared-travel/[driver]/_components/gallery";
import { Driver } from "@/lib/services/driver-service";
import Contacts from "@/app/[locale]/travel/shared-travel/[driver]/_components/contacts";
import ThePost from "@/app/[locale]/travel/shared-travel/[driver]/_components/the-post";

type MainProps = {
    driver: Driver;
}

export default function Main({ driver }: MainProps) {

    const images: string[] = driver.images && JSON.parse(driver.images as string) || [];

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
