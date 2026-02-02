import { MainNavbar } from "@/components/main-navbar";
import { Hero } from "@/app/home/hero";
import { getCountries } from "@/lib/services/country-service";
import { CardGrid } from "@/components/card-grid";
import { CardEntity } from "@/components/card-item";

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
                title={`ПЪТУВАХ, РАБОТИ, ЖИВЕЙ`}
                subtitle={`С "АЗ МИГРАНТЪТ"!`}
                imageUrl="/images/azmigrantat-hero-background.webp"
                ctaText="РАЗГЛЕЖДАНЕ"
                ctaLink="#countries"
            />
            <CardGrid
                items={mappedCountries}
                id="countries"
                isWithSearch={true}
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                hrefPrefix=""
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}
