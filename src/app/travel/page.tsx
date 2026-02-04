import { Metadata } from "next";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { MainNavbar } from "@/components/main-navbar";
import PageHeader from "@/components/page-header";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { CardGrid } from "@/components/card-grid";
import { TRAVEL_CATEGORIES } from "@/lib/constants";
import { getBannerByColumn } from "@/lib/services/banner-service";

export async function generateMetadata(): Promise<Metadata> {
    const title = `Пътуване – информация за транспорт и услуги`;
    const description = `Научете всичко за различните видове транспорт: самолетни билети, автобуси, влакове, круизи, таксита и споделено пътуване. Полезна информация за пътуващи и туристи.`;
    const url = "/travel";

    const firstCategoryImage = TRAVEL_CATEGORIES[0]?.image
        ? (absoluteUrl(TRAVEL_CATEGORIES[0].image) as string)
        : (absoluteUrl("/images/plane-travel.png") as string);

    const categoryKeywords = TRAVEL_CATEGORIES.map((c) => c.name);

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
                    url: firstCategoryImage,
                    width: 1200,
                    height: 630,
                    alt: "Пътуване – категории транспорт",
                },
            ],
        },

        twitter: {
            card: "summary_large_image",
            title: websiteName(title),
            description,
            images: [firstCategoryImage],
        },

        keywords: [
            "пътуване",
            "транспорт",
            "самолетни билети",
            "автобуси",
            "влакове",
            "круизи",
            "таксита",
            "споделено пътуване",
            ...categoryKeywords,
        ],
    };
}

export default async function TravelPage() {
    const banner = await getBannerByColumn("link", "/travel");

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване" },
    ];

    const mappedCategories = TRAVEL_CATEGORIES.map((category) => ({
        name: category.name,
        slug: category.slug,
        imageUrl: category.image,
    }));

    return (
        <>
            <MainNavbar />

            <div className="relative w-full h-130 shrink-0">
                <PageHeader
                    title={
                        <div>
                            Пътувай с{" "}
                            <span className="text-website-light">
                                „Аз мигрантът“!
                            </span>
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
