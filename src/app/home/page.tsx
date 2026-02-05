import { MainNavbar } from "@/components/main-navbar";
import { Hero } from "@/app/home/hero";
import { getCountries } from "@/lib/services/country-service";
import { CardGrid } from "@/components/card-grid";
import { CardEntity } from "@/components/card-item";
import TypewriterTexts from "@/app/home/animated-typewriter-texts";
import { HOME_ELEMENTS } from "@/lib/constants";
import Advertisement from "@/app/home/advertisement";
import ContactsHeader from "@/app/home/contacts-header";
import Map from "@/app/home/map";
import ContactsInfo from "@/app/home/contacts-info";
import FacebookPage from "@/app/home/facebook-page";

export default async function HomePage() {
    const countries = await getCountries();

    const mappedCountries: CardEntity[] = countries.map((country) => ({
        slug: country.slug!,
        name: country.name!,
        imageUrl: country.image_url!,
        excerpt: country.excerpt!,
    }));

    return (
        <>
            <MainNavbar />
            <Hero
                title={`ПЪТУВАЙ, РАБОТИ, ЖИВЕЙ`}
                subtitle={`С "АЗ МИГРАНТЪТ"!`}
                imageUrl="/images/azmigrantat-hero-background.webp"
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
