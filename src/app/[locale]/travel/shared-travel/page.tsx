import { Metadata } from "next";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { MainNavbar } from "@/components/main-right-navbar";
import SharedTravelHero from "@/app/[locale]/travel/shared-travel/_components/hero";
import { getBannerByColumn } from "@/lib/services/banner-service";
import SharedTravelSearchForm from "./_components/search-form";
import { getCities } from "@/lib/services/city-service";
import DriversGrid from "@/app/[locale]/travel/shared-travel/_components/drivers-grid";
import Spacer from "@/components/spacer";
import PostsGrid from "@/app/[locale]/travel/shared-travel/_components/posts-grid";

export async function generateMetadata(): Promise<Metadata> {
    const title =
        "Споделено пътуване – намерете и споделете пътувания с други пътешественици";
    const description =
        "Лесно и безопасно намерете или споделете пътуването си с други пътешественици. Разгледайте оферти, маршрути и опции за споделено пътуване в града или страната.";
    const url = "/travel/shared-travel";

    const image = absoluteUrl(
        "/images/shared-travel/travel-background.webp",
    ) as string;

    return {
        title: websiteName(title),
        description,

        alternates: {
            canonical: absoluteUrl(url),
        },

        openGraph: {
            title: websiteName(title),
            description,
            url: absoluteUrl(url),
            siteName: websiteName(),
            locale: "bg_BG",
            type: "website",
            images: [
                {
                    url: image,
                    width: 1200,
                    height: 630,
                    alt: "Споделено пътуване – намерете и споделете пътувания",
                },
            ],
        },

        twitter: {
            card: "summary_large_image",
            title: websiteName(title),
            description,
            images: [image],
        },

        keywords: [
            "споделено пътуване",
            "carpooling България",
            "пътуване с други пътешественици",
            "споделяне на пътувания",
            "намиране на пътници",
            "безопасно пътуване",
        ],
    };
}

export default async function SharedTravelPage() {
    const heroBanner = await getBannerByColumn("link", "/travel/shared-travel");

    const cities = await getCities();

    return (
        <main>
            <MainNavbar />
            {heroBanner && <SharedTravelHero banner={heroBanner} />}
            <SharedTravelSearchForm cities={cities} />
            <Spacer direction="horizontal" size={32} />
            <PostsGrid />
            <Spacer direction="horizontal" size={32} />
            <DriversGrid />
            <Spacer direction="horizontal" size={32} />
        </main>
    );
}
