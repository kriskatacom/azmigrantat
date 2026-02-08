import { getTranslations } from "next-intl/server";
import { MainNavbar } from "@/components/main-right-navbar";
import { Hero } from "@/app/[locale]/hero";
import { getCountries } from "@/lib/services/country-service";
import { CardGrid } from "@/components/card-grid";
import { CardEntity } from "@/components/card-item";
import TypewriterTexts from "@/app/[locale]/animated-typewriter-texts";
import { HOME_ELEMENTS } from "@/lib/constants";
import Advertisement from "@/app/[locale]/advertisement";
import ContactsHeader from "@/app/[locale]/contacts-header";
import Map from "@/app/[locale]/map";
import ContactsInfo from "@/app/[locale]/contacts-info";
import FacebookPage from "@/app/[locale]/facebook-page";

export default async function HomePage() {
    const t = await getTranslations("homepage");

    const countries = await getCountries();

    const mappedCountries: CardEntity[] = countries.map((country) => ({
        slug: country.slug!,
        name: country.name!,
        image_url: country.image_url!,
        excerpt: country.excerpt!,
    }));

    return (
        <>
            <MainNavbar />
            <Hero
                title={t("title")}
                subtitle={t("subtitle")}
                image_url="/images/azmigrantat-hero-background.webp"
                ctaText={t("cta")}
                ctaLink="#countries"
            />
            <CardGrid
                items={mappedCountries}
                id="countries"
                isWithSearch={true}
                buttonText=""
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                hrefPrefix=""
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
            <TypewriterTexts />
            <CardGrid
                items={HOME_ELEMENTS}
                id="elements"
                variant="standart"
                columns={{ base: 1 }}
                height={{ base: 240, lg: 400 }}
            />
            <Advertisement />
            <ContactsHeader />
            <Map />
            <ContactsInfo />
            <FacebookPage />
        </>
    );
}
