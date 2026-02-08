import { Metadata } from "next";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import LeafletMap from "@/app/[locale]/travel/air-tickets/leaflet-map";
import { MainNavbar } from "@/components/main-navbar";
import PageHeader from "@/components/page-header";
import { AIR_TICKETS_PAGE_ITEMS } from "@/lib/constants";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { CardGrid } from "@/components/card-grid";
import { getAirports } from "@/lib/services/airports-service";
import { Airport, Coordinates } from "@/lib/types";
import { MapMarker } from "@/components/leaflet-map";
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
    const banner = await getBannerByColumn("link", "/travel/air-tickets");

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Самолетни билети" },
    ];

    const airports = await getAirports();
    
    const mappedAirports: MapMarker[] = airports
        .filter(
            (x): x is Airport & { coordinates: Coordinates } =>
                x.coordinates !== null,
        )
        .map((x) => ({
            id: x.id,
            coordinates: x.coordinates,
            label: x.name,
            description: x.description,
            image: x.image_url,
            websiteUrl: x.website_url,
        }));
        
    return (
        <>
            <MainNavbar />
            <PageHeader
                title="Самолетни билети"
                breadcrumbs={breadcrumbs}
                banner={banner}
            />
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
