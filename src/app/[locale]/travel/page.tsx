import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { MainNavbar } from "@/components/main-right-navbar";
import PageHeader from "@/components/page-header";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { CardGrid } from "@/components/card-grid";
import { getBannerByColumn } from "@/lib/services/banner-service";

type PageProps = {
    params: Promise<{ locale: string }>;
};

const TRAVEL_CATEGORY_SLUGS = [
    "airTickets",
    "autobuses",
    "trains",
    "cruises",
    "taxis",
    "sharedTravel"
] as const;

const TRAVEL_CATEGORY_IMAGES: Record<string, string> = {
    airTickets: "/images/air-tickets.png",
    autobuses: "/images/avtobuses.png",
    trains: "/images/trains.png",
    cruises: "/images/cruises.png",
    taxis: "/images/taxis.png",
    sharedTravel: "/images/shared-plane-travel.png",
};

const TRAVEL_CATEGORY_PATHS: Record<string, string> = {
    airTickets: "/air-tickets",
    autobuses: "/autobuses",
    trains: "/trains",
    cruises: "/cruises",
    taxis: "/taxis",
    sharedTravel: "/shared-travel",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "metadata.travelPage" });
    const url = locale === "bg" ? "/travel" : `/${locale}/travel`;

    const firstCategoryImage = absoluteUrl("/images/air-tickets.png") as string;

    return {
        title: websiteName(t("title")),
        description: t("description"),

        alternates: {
            canonical: absoluteUrl(url),
        },

        openGraph: {
            title: websiteName(t("title")),
            description: t("description"),
            url: absoluteUrl(url),
            siteName: websiteName(),
            locale: locale === "bg" ? "bg_BG" : "en_US",
            type: "website",
            images: [
                {
                    url: firstCategoryImage,
                    width: 1200,
                    height: 630,
                    alt: t("title"),
                },
            ],
        },

        twitter: {
            card: "summary_large_image",
            title: websiteName(t("title")),
            description: t("description"),
            images: [firstCategoryImage],
        },
    };
}

export default async function TravelPage({ params }: PageProps) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "travel" });
    const tCommon = await getTranslations({ locale, namespace: "common" });
    const tCategories = await getTranslations({ locale, namespace: "travel.categories" });

    const banner = await getBannerByColumn("link", "/travel");

    const breadcrumbs: BreadcrumbItem[] = [
        { name: tCommon("home"), href: "/" },
        { name: t("title") },
    ];

    const mappedCategories = TRAVEL_CATEGORY_SLUGS.map((key) => ({
        name: tCategories(key),
        slug: TRAVEL_CATEGORY_PATHS[key],
        image_url: TRAVEL_CATEGORY_IMAGES[key],
    }));

    return (
        <>
            <MainNavbar />

            <div className="relative w-full h-130 shrink-0">
                <PageHeader
                    title={
                        <div>
                            {t("heading")}
                        </div>
                    }
                    banner={banner}
                    breadcrumbs={breadcrumbs}
                />

                <CardGrid
                    items={mappedCategories}
                    id="countries"
                    loadMoreStep={8}
                    initialVisible={8}
                    variant="standart"
                    hrefPrefix="/travel"
                    columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
                />
            </div>
        </>
    );
}
