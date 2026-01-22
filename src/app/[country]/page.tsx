import { redirect } from "next/navigation";
import { getCountryByColumn } from "@/lib/services/country-service";
import { getCountryElementsByColumn } from "@/lib/services/country-element-service";
import { CountryElement } from "@/lib/types";
import { MainNavbar } from "@/components/main-navbar";
import { CardGrid } from "@/components/card-grid";
import { CardEntity } from "@/components/card-item";
import { Hero } from "@/app/[country]/hero";

type PageProps = {
    params: Promise<{
        country: string;
    }>;
};

export default async function CountryPage({ params }: PageProps) {
    const { country } = await params;

    const countryData = await getCountryByColumn("slug", country);
    let countryElements: CountryElement[] = [];

    if (!countryData || !countryData.id) {
        return redirect("/");
    }

    countryElements = await getCountryElementsByColumn(
        "country_id",
        countryData.id.toString(),
    );

    const mappedCountryElements: CardEntity[] = countryElements.map(
        (countryElement) => ({
            slug: countryElement.slug!,
            name: countryElement.name!,
            imageUrl: countryElement.image_url!,
        }),
    );

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
            <CardGrid
                items={mappedCountryElements}
                id="learn-more"
                hrefPrefix={countryData.slug}
            />
        </>
    );
}
