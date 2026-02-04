import { Metadata } from "next";
import { redirect } from "next/navigation";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { MainNavbar } from "@/components/main-navbar";
import PageHeader from "@/components/page-header";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { CardEntity } from "@/components/card-item";
import { getCountryByColumn } from "@/lib/services/country-service";
import { CardGrid } from "@/components/card-grid";
import { Airport } from "@/lib/types";
import { getAirports } from "@/lib/services/airports-service";
import { getBannerByColumn } from "@/lib/services/banner-service";

type Props = {
    params: Promise<{
        country: string;
    }>;
};

export async function generateMetadata(): Promise<Metadata> {
    const title = `Европейски летища – информация и връзки към официални сайтове`;
    const description = `Разгледайте всички големи европейски летища с персонализирани пинчета на карта. На всяко летище ще намерите снимка, описание и линк към официалния сайт.`;
    const url = "/europe/airports";

    const image = absoluteUrl("/images/air-tickets.png") as string;

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
                    alt: "Европейски летища",
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
            "летища в Европа",
            "европейски летища",
            "международни летища",
            "карта на летища в Европа",
            "информация за летища",
            "официални сайтове летища",
        ],
    };
}

export default async function Airports({ params }: Props) {
    const countrySlug = (await params).country;
    const banner = await getBannerByColumn("link", `/travel/air-tickets/countries/${countrySlug}`);

    const country = await getCountryByColumn("slug", countrySlug);

    if (!country || !country.name) {
        return redirect("/");
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Самолетни билети", href: "/travel/air-tickets" },
        { name: "Летища по държави", href: "/travel/air-tickets/countries" },
        { name: country.name },
    ];

    const airports = await getAirports({
        where: [{ column: "country_id", value: country.id }],
    });
    const mappedAirports: CardEntity[] = airports
        .filter(
            (
                airport,
            ): airport is Airport & {
                name: string;
                website_url: string;
                image_url: string;
            } => Boolean(airport.name && airport.slug && airport.image_url),
        )
        .map((airport) => ({
            name: airport.name,
            slug: airport.website_url,
            imageUrl: airport.image_url,
            linkType: "external",
        }));

    return (
        <>
            <MainNavbar />
            <PageHeader
                title={`Летища в ${country.name}`}
                breadcrumbs={breadcrumbs}
                banner={banner}
            />
            <CardGrid
                items={mappedAirports}
                id="airports"
                isWithSearch
                searchPlaceholder={`Търсене на летища в ${country.name}...`}
                noItemsMessage={`Няма намерени летища в ${country.name}.`}
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}