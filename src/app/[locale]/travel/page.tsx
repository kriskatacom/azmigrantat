import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { MainNavbar } from "@/components/main-right-navbar";
import PageHeader from "@/components/page-header";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { CardGrid } from "@/components/card-grid";
import { getBannerByColumn } from "@/lib/services/banner-service";
import { UserService } from "@/lib/services/user-service";
import { TRAVEL_CATEGORIES } from "@/lib/constants";

type PageProps = {
    params: Promise<{ locale: string }>;
};

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({
        locale,
        namespace: "metadata.travelPage",
    });

    const url = locale === "bg" ? "/travel" : `/${locale}/travel`;

    const firstCategoryImage = absoluteUrl(
        TRAVEL_CATEGORIES[0].image,
    ) as string;

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
    const userService = new UserService();
    const user = await userService.getCurrentUser();

    const { locale } = await params;

    const t = await getTranslations({ locale, namespace: "travel" });
    const tCommon = await getTranslations({ locale, namespace: "common" });

    const banner = await getBannerByColumn("link", "/travel");

    const breadcrumbs: BreadcrumbItem[] = [
        { name: tCommon("home"), href: "/" },
        { name: t("title") },
    ];

    return (
        <>
            <MainNavbar user={user} />

            <div className="relative w-full h-130 shrink-0">
                <PageHeader
                    title={<div>{t("heading")}</div>}
                    banner={banner}
                    breadcrumbs={breadcrumbs}
                />

                <CardGrid
                    items={TRAVEL_CATEGORIES.map((category) => ({
                        name: category.name,
                        slug: category.slug,
                        image_url: category.image,
                        buttonText: category.buttonText,
                    }))}
                    id="travel-categories"
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
