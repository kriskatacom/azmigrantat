import { Metadata } from "next";
import { redirect } from "next/navigation";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { MainNavbar } from "@/components/main-right-navbar";
import PageHeader from "@/components/page-header";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { CardEntity } from "@/components/card-item";
import { getCountryByColumn } from "@/lib/services/country-service";
import { CardGrid } from "@/components/card-grid";
import { Airline, Airport } from "@/lib/types";
import { getBannerByColumn } from "@/lib/services/banner-service";
import { UserService } from "@/lib/services/user-service";
import { getAirlines } from "@/lib/services/airline-service";

export async function generateMetadata(): Promise<Metadata> {
    const title = `Европейски авиокомпании – информация и връзки към официални сайтове`;
    const description = `Разгледайте всички големи европейски авиокомпании с персонализирани пинчета на карта. На всяко летище ще намерите снимка, описание и линк към официалния сайт.`;
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
                    alt: "Европейски авиокомпании",
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
            "авиокомпании в Европа",
            "европейски авиокомпании",
            "международни авиокомпании",
            "карта на авиокомпании в Европа",
            "информация за авиокомпании",
            "официални сайтове авиокомпании",
        ],
    };
}

export default async function Airlines() {
    const userService = new UserService();
    const user = await userService.getCurrentUser();

    const banner = await getBannerByColumn(
        "link",
        `/travel/air-tickets/airlines`,
    );

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Самолетни билети", href: "/travel/air-tickets" },
        { name: "Авиокомпании" },
    ];

    const airlines = await getAirlines();
    const mappedAirlines: CardEntity[] = airlines
        .filter(
            (
                airline,
            ): airline is Airline & {
                name: string;
                website_url: string;
                image_url: string;
            } => Boolean(airline.name && airline.slug && airline.image_url),
        )
        .map((line) => ({
            name: line.name,
            slug: line.website_url,
            image_url: line.image_url,
            linkType: "external",
        }));

    return (
        <>
            <MainNavbar user={user} />
            <PageHeader
                title="Авиокомпании"
                breadcrumbs={breadcrumbs}
                banner={banner}
            />
            <CardGrid
                items={mappedAirlines}
                id="airlines"
                isWithSearch
                searchPlaceholder={`Търсене на авиокомпании...`}
                noItemsMessage={`Няма намерени авиокомпании.`}
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                hrefPrefix=""
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}
