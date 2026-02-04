import { Metadata } from "next";
import { redirect } from "next/navigation";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { MainNavbar } from "@/components/main-navbar";
import PageHeader from "@/components/page-header";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { CardEntity } from "@/components/card-item";
import { getCountryByColumn } from "@/lib/services/country-service";
import { CardGrid } from "@/components/card-grid";
import { Autobus, Train } from "@/lib/types";
import { getCityByColumn } from "@/lib/services/city-service";
import { getAutobuses } from "@/lib/services/autobus-service";
import { getTrains } from "@/lib/services/train-service";
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

    if (!country || !country.name || !city || !city.name) {
        return redirect("/");
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Железопътни гари", href: "/travel/trains" },
        { name: country.name, href: `/travel/trains/${country.slug}` },
        { name: city.name },
    ];

    const trains = await getTrains({
        where: [
            { column: "country_id", value: country.id },
            { column: "city_id", value: city.id },
        ],
    });
    const mappedTrains: CardEntity[] = trains
        .filter(
            (
                train,
            ): train is Train & {
                name: string;
                website_url: string;
                image_url: string;
            } => Boolean(train.name && train.website_url && train.image_url),
        )
        .map((train) => ({
            name: train.name,
            slug: train.website_url,
            imageUrl: train.image_url,
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
                title={`Железопътни гари в ${country.name}`}
                breadcrumbs={breadcrumbs}
            />
            <CardGrid
                items={mappedTrains}
                id="airports"
                isWithSearch
                searchPlaceholder={`Търсене на железопътни гари в ${country.name}...`}
                noItemsMessage={`Няма намерени железопътни гари в ${country.name}.`}
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}
