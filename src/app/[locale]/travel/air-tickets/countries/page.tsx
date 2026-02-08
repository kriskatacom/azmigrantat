import { Metadata } from "next";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { MainNavbar } from "@/components/main-navbar";
import PageHeader from "@/components/page-header";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { CardEntity } from "@/components/card-item";
import { getCountries } from "@/lib/services/country-service";
import { CardGrid } from "@/components/card-grid";
import { Country } from "@/lib/types";
import { getBannerByColumn } from "@/lib/services/banner-service";

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

export default async function Airports() {
    const banner = await getBannerByColumn("link", "/travel/air-tickets/countries");

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Самолетни билети", href: "/travel/air-tickets" },
        { name: "Летища по държави" },
    ];

    const countries = await getCountries();
    const mappedCountries: CardEntity[] = countries
        .filter(
            (
                country,
            ): country is Country & {
                name: string;
                slug: string;
                image_url: string;
            } => Boolean(country.name && country.slug && country.image_url),
        )
        .map((country) => ({
            name: country.name!,
            slug: country.slug!,
            image_url: country.image_url,
        }));

    return (
        <>
            <MainNavbar />
            <PageHeader
                title="Летища по държави"
                breadcrumbs={breadcrumbs}
                banner={banner}
            />
            <CardGrid
                items={mappedCountries}
                id="countries"
                isWithSearch
                searchPlaceholder="Търсене на държави"
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                hrefPrefix="/travel/air-tickets/countries"
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}