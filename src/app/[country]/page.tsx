import { MainNavbar } from "@/components/main-navbar";
import { Hero } from "./hero";
import { getCountryBySlug } from "@/lib/services/country-service";

type PageProps = {
    params: Promise<{
        country: string;
    }>;
};

export default async function CountryPage({ params }: PageProps) {
    const { country } = await params;

    const countryData = await getCountryBySlug(country);

    return (
        <>
            <MainNavbar />
            <Hero
                title={countryData.name}
                excerpt={countryData.excerpt}
                imageUrl={countryData.image_url}
                ctaText="Научете повече"
                ctaLink="#learn-more"
            />
            <div>{country}</div>
        </>
    );
}
