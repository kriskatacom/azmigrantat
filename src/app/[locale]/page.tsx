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
import { UserService } from "@/lib/services/user-service";
import ServicesSections from "./services-sections";

const userService = new UserService();

export default async function HomePage() {
    const user = await userService.getCurrentUser();

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
            <MainNavbar user={user} />
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
            <ServicesSections />
            <Advertisement />
            <ContactsHeader />
            <Map />
            <ContactsInfo />
            <FacebookPage />
        </>
    );
}
