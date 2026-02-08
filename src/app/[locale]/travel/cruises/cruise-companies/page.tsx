import { Metadata } from "next";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { MainNavbar } from "@/components/main-right-navbar";
import PageHeader from "@/components/page-header";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { CardGrid } from "@/components/card-grid";
import { CardEntity } from "@/components/card-item";
import { Cruise } from "@/lib/types";
import { getCruises } from "@/lib/services/cruise-service";
import { getBannerByColumn } from "@/lib/services/banner-service";

export async function generateMetadata(): Promise<Metadata> {
    const title = `Круизи в Европа – маршрути, пристанища и полезна информация`;
    const description = `Открийте круизите в Европа – популярни маршрути, круизни пристанища и туристически дестинации. Намерете снимки, описания и официални сайтове за круизни пътувания по държави и градове.`;
    const url = "/europe/cruises";

    const image = absoluteUrl("/images/cruises.png") as string;

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
                    alt: "Круизи и круизни пристанища в Европа",
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
            "круизи в Европа",
            "круизни пътувания",
            "круизни маршрути Европа",
            "круизни пристанища",
            "пътуване с круизен кораб",
            "Средиземноморски круизи",
            "Северна Европа круизи",
        ],
    };
}

export default async function CruisesPage() {
    const banner = await getBannerByColumn("link", `/travel/cruise-companies`);

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Круизи", href: "/travel/cruise-companies" },
        { name: "Круизни компании" },
    ];

    const cruises = await getCruises();
    const mappedCruises: CardEntity[] = cruises
        .filter(
            (
                cruise,
            ): cruise is Cruise & {
                name: string;
                website_url: string;
                image_url: string;
            } => Boolean(cruise.name && cruise.website_url && cruise.image_url),
        )
        .map((cruise) => ({
            name: cruise.name,
            slug: cruise.website_url,
            image_url: cruise.image_url,
            linkType: "external",
        }));

    return (
        <>
            <MainNavbar />
            <PageHeader
                title="Круизни компании"
                breadcrumbs={breadcrumbs}
                banner={banner}
            />
            <CardGrid
                items={mappedCruises}
                id="cruises"
                isWithSearch
                searchPlaceholder="Търсене на круизни компании"
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}
