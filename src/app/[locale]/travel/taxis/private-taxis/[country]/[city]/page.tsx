import { Metadata } from "next";
import { redirect } from "next/navigation";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { MainNavbar } from "@/components/main-navbar";
import PageHeader from "@/components/page-header";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { CardEntity } from "@/components/card-item";
import { getCountryByColumn } from "@/lib/services/country-service";
import { CardGrid } from "@/components/card-grid";
import { Taxi } from "@/lib/types";
import { getCityByColumn } from "@/lib/services/city-service";
import { getTaxis } from "@/lib/services/taxi-service";
import { getBannerByColumn } from "@/lib/services/banner-service";

type Props = {
    params: Promise<{
        country: string;
        city: string;
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
    const citySlug = (await params).city;

    const banner = await getBannerByColumn("link", `/travel/taxis/private-taxis/${countrySlug}/${citySlug}`);

    const country = await getCountryByColumn("slug", countrySlug);
    const city = await getCityByColumn("slug", citySlug);

    if (!country || !country.name || !city || !city.name) {
        return redirect("/");
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Таксита", href: "/travel/taxis" },
        {
            name: "Частни таксита по държави",
            href: "/travel/taxis/private-taxis",
        },
        { name: `Градове в ${country.name}` },
    ];

    const taxis = await getTaxis({
        where: [
            { column: "country_id", value: country.id },
            { column: "city_id", value: city.id },
        ],
    });
    const mappedTaxis: CardEntity[] = taxis
        .filter(
            (
                taxi,
            ): taxi is Taxi & {
                name: string;
                website_url: string;
                image_url: string;
            } => Boolean(taxi.name && taxi.website_url && taxi.image_url),
        )
        .map((taxi) => ({
            name: taxi.name,
            slug: taxi.website_url,
            image_url: taxi.image_url,
            linkType: "external",
        }));

    return (
        <>
            <MainNavbar />
            <PageHeader
                title={`Таксиметрови компании в ${country.name}`}
                breadcrumbs={breadcrumbs}
                banner={banner}
            />
            <CardGrid
                items={mappedTaxis}
                id="airports"
                isWithSearch
                searchPlaceholder={`Търсене на таксиметрови компании в ${country.name}...`}
                noItemsMessage={`Няма намерени таксиметрови компании в ${country.name}.`}
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}