import { redirect } from "next/navigation";
import { Metadata } from "next";
import { MainNavbar } from "@/components/main-right-navbar";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { CardGrid } from "@/components/card-grid";
import { CardEntity } from "@/components/card-item";
import { getCountryByColumn } from "@/lib/services/country-service";
import { getLandmarks } from "@/lib/services/landmark-service";
import { websiteName } from "@/lib/utils";
import PageHeader from "@/components/page-header";
import { getBannerByColumn } from "@/lib/services/banner-service";
import { UserService } from "@/lib/services/user-service";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const countrySlug = (await params).country;
    const country = await getCountryByColumn("slug", countrySlug);

    if (!country || !country.name) {
        return redirect("/");
    }

    const title = `Забележителности в ${country.name} | Туристически атракции и места за посещение`;
    const description = `Разгледай най-популярните забележителности в ${country.name} – исторически обекти, природни атракции и туристически места, които си заслужава да посетиш.`;

    const url = `/${country.slug}/landmarks`;

    return {
        title: websiteName(title),
        description,

        keywords: [
            `забележителности в ${country.name}`,
            `${country.name} туристически атракции`,
            `какво да видя в ${country.name}`,
            `интересни места в ${country.name}`,
            `туризъм ${country.name}`,
            `културни и природни забележителности`,
        ],

        alternates: {
            canonical: url,
        },

        openGraph: {
            title: websiteName(title),
            description,
            url,
            siteName: websiteName(),
            locale: "bg_BG",
            type: "website",
        },

        twitter: {
            card: "summary_large_image",
            title: websiteName(title),
            description,
        },
    };
}

type Props = {
    params: Promise<{
        country: string;
    }>;
};

export default async function LandmarksPage({ params }: Props) {
    const userService = new UserService();
    const user = await userService.getCurrentUser();

    const t = await getTranslations("country");

    const countrySlug = (await params).country;

    const country = await getCountryByColumn("slug", countrySlug);

    if (!country || !country.name) {
        return redirect("/");
    }

    const landmarks = await getLandmarks({
        column: "country_id",
        value: country.id,
    });

    const mappedLandmarks: CardEntity[] = landmarks.map((landmark) => ({
        slug: landmark.slug!,
        name: landmark.name!,
        image_url: landmark.image_url!,
        excerpt: landmark.excerpt!,
    }));

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: country.name, href: `/${country.slug}` },
        { name: "Забележителности", href: `/${country.slug}/landmarks` },
    ];

    const banner = await getBannerByColumn(
        "link",
        `/${country.slug}/landmarks`,
    );

    return (
        <>
            <MainNavbar user={user} />

            <PageHeader
                title={`${t("landmarks.landmarksIn")} ${country.name}`}
                breadcrumbs={breadcrumbs}
                banner={banner}
            />

            <CardGrid
                items={mappedLandmarks}
                id="landmarks"
                searchPlaceholder={t("landmarks.search")}
                isWithSearch={true}
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                hrefPrefix={`/${country.slug}/landmarks`}
                columns={{ base: 1, sm: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}
