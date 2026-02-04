import { Metadata } from "next";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import LeafletMap from "@/app/travel/air-tickets/leaflet-map";
import { MainNavbar } from "@/components/main-navbar";
import PageHeader from "@/components/page-header";
import { AIR_TICKETS_PAGE_ITEMS, AIRPORTS_DATA } from "@/lib/constants";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { CardGrid } from "@/components/card-grid";
import { getAirports } from "@/lib/services/airports-service";
import { CardEntity } from "@/components/card-item";
import { Airport } from "@/lib/types";
import { MapMarker } from "@/components/leaflet-map";
import AppImage from "@/components/AppImage";
import { headers } from "next/headers";
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

export default async function AirTickets() {
    const path = new URL((await headers()).get("referer") || "").pathname;
    const banner = await getBannerByColumn("link", path);

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Самолетни билети" },
    ];

    const airports = await getAirports();
    const mappedAirports: MapMarker[] = airports
        .filter(
            (
                airport,
            ): airport is Airport & {
                latitude: number;
                longitude: number;
                description: string;
                image_url: string;
            } =>
                airport.latitude !== undefined &&
                airport.longitude !== undefined &&
                airport.description !== undefined &&
                airport.image_url !== undefined,
        )
        .map((airport) => ({
            id: airport.id,
            label: airport.name,
            lat: airport.latitude,
            lng: airport.longitude,
            description: airport.description,
            image: airport.image_url,
            websiteUrl: airport.website_url,
        }));

    return (
        <>
            <MainNavbar />
            {banner?.image && (
                <div className="relative w-full h-130 shrink-0">
                    <AppImage
                        src={banner.image}
                        alt={websiteName("Пътуване")}
                        fill
                        className="object-cover rounded w-full h-full"
                    />
                </div>
            )}
            <PageHeader title="Самолетни билети" breadcrumbs={breadcrumbs} />
            <CardGrid
                items={AIR_TICKETS_PAGE_ITEMS}
                id="countries"
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                hrefPrefix="/travel/air-tickets"
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
            <LeafletMap markers={mappedAirports} />
        </>
    );
}
