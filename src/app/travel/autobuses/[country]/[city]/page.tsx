import { Metadata } from "next";
import { redirect } from "next/navigation";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { MainNavbar } from "@/components/main-navbar";
import PageHeader from "@/components/page-header";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { CardEntity } from "@/components/card-item";
import { getCountryByColumn } from "@/lib/services/country-service";
import { CardGrid } from "@/components/card-grid";
import { Airport, Autobus } from "@/lib/types";
import { getAirports } from "@/lib/services/airports-service";
import { getCityByColumn } from "@/lib/services/city-service";
import { getAutobuses } from "@/lib/services/autobus-service";
import AppImage from "@/components/AppImage";

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

    const country = await getCountryByColumn("slug", countrySlug);
    const city = await getCityByColumn("slug", citySlug);

    if (!country || !country.name || !city || !city.id) {
        return redirect("/");
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Автобусни гари", href: "/travel/autobuses" },
        { name: "Градове", href: `/travel/air-tickets/${country.slug}` },
        { name: country.name },
    ];

    const autobuses = await getAutobuses({
        where: [
            { column: "country_id", value: country.id },
            { column: "city_id", value: city.id },
        ],
    });
    const mappedAutobuses: CardEntity[] = autobuses
        .filter(
            (
                autobus,
            ): autobus is Autobus & {
                name: string;
                website_url: string;
                image_url: string;
            } =>
                Boolean(
                    autobus.name && autobus.website_url && autobus.image_url,
                ),
        )
        .map((autobus) => ({
            name: autobus.name,
            slug: autobus.website_url,
            imageUrl: autobus.image_url,
            linkType: "external",
        }));

    return (
        <>
            <MainNavbar />
            <div className="relative w-full h-130 shrink-0">
                <AppImage
                    src={"/images/plane-travel.png"}
                    alt={websiteName("Пътуване")}
                    fill
                    className="object-cover rounded w-full h-full"
                />
            </div>
            <PageHeader
                title={`Летища в ${country.name}`}
                breadcrumbs={breadcrumbs}
            />
            <CardGrid
                items={mappedAutobuses}
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