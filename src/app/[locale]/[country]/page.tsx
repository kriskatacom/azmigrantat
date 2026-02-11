import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getCountryByColumn } from "@/lib/services/country-service";
import { getCountryElementsByColumn } from "@/lib/services/country-element-service";
import { CountryElement } from "@/lib/types";
import { MainNavbar } from "@/components/main-right-navbar";
import { CardGrid } from "@/components/card-grid";
import { CardEntity } from "@/components/card-item";
import { Hero } from "@/app/[locale]/[country]/hero";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { UserService } from "@/lib/services/user-service";

type PageProps = {
    params: Promise<{
        country: string;
    }>;
};

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { country: countrySlug } = await params;
    const countryData = await getCountryByColumn("slug", countrySlug);

    if (!countryData || !countryData.name) {
        return redirect("/");
    }

    const title = `${countryData.name} – информация, забележителности и посолства`;
    const description = `Научете повече за ${countryData.name} – забележителности, посолства, култура и полезна информация за пътуващи и граждани.`;
    const url = `/${countryData.slug}`;
    const image = countryData.image_url
        ? absoluteUrl(countryData.image_url)
        : undefined;

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
            images: image
                ? [
                      {
                          url: image,
                          width: 1200,
                          height: 630,
                          alt: countryData.name,
                      },
                  ]
                : undefined,
        },

        twitter: {
            card: "summary_large_image",
            title: websiteName(title),
            description,
            images: image ? [image] : undefined,
        },

        keywords: [
            `${countryData.name} забележителности`,
            `${countryData.name} посолства`,
            `туристическа информация ${countryData.name}`,
            `култура в ${countryData.name}`,
        ],
    };
}

export default async function CountryPage({ params }: PageProps) {
    const userService = new UserService();
    const user = await userService.getCurrentUser();

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
            image_url: countryElement.image_url!,
        }),
    );

    return (
        <>
            <MainNavbar user={user} />
            <Hero
                title={countryData.name}
                excerpt={countryData.excerpt}
                image_url={countryData.image_url as string}
                ctaText="Научете повече"
                ctaLink="#learn-more"
            />
            <CardGrid
                items={mappedCountryElements}
                id="learn-more"
                hrefPrefix={countryData.slug}
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}
