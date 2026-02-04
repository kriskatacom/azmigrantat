import { Metadata } from "next";
import { redirect } from "next/navigation";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { MainNavbar } from "@/components/main-navbar";
import PageHeader from "@/components/page-header";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { CardGrid } from "@/components/card-grid";
import { CardEntity } from "@/components/card-item";
import { getCountryByColumn } from "@/lib/services/country-service";
import { getCities } from "@/lib/services/city-service";
import { City } from "@/lib/types";
import { getBannerByColumn } from "@/lib/services/banner-service";

export async function generateMetadata(): Promise<Metadata> {
    const title = `Автобусни гари и автобусни превози в Европа – информация и адреси`;
    const description = `Открийте автобусни гари и автобусни превози в Европа, подредени по държави и градове. Ще намерите имена, адреси, снимки, описания и полезна информация за пътуване с автобус.`;
    const url = "/europe/autobuses";

    const image = absoluteUrl("/images/autobuses.png") as string;

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
                    alt: "Автобусни гари и автобусни превози в Европа",
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
            "автобуси в Европа",
            "автобусни гари Европа",
            "автобусни превози Европа",
            "международни автобуси",
            "адреси на автобусни гари",
            "пътуване с автобус в Европа",
            "автобуси по държави и градове",
        ],
    };
}

type Props = {
    params: Promise<{
        country: string;
    }>;
};

export default async function AutobusesByCountryPage({ params }: Props) {
    const countrySlug = (await params).country;
    const banner = await getBannerByColumn("link", `/travel/autobuses/${countrySlug}`);

    const country = await getCountryByColumn("slug", countrySlug);

    if (!country) {
        return redirect("/travel/autobuses");
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Автобуси", href: country.name },
        { name: `Автобуси в ${country.name}` },
    ];

    const cities = await getCities({ column: "country_id", value: country.id });
    const mappedCities: CardEntity[] = cities
        .filter(
            (
                city,
            ): city is City & {
                name: string;
                slug: string;
                image_url: string;
            } => Boolean(city.name && city.slug && city.image_url),
        )
        .map((city) => ({
            name: city.name,
            slug: city.slug,
            imageUrl: city.image_url,
        }));

    return (
        <>
            <MainNavbar />
            <PageHeader
                title={`Автобуси в ${country.name}`}
                breadcrumbs={breadcrumbs}
                banner={banner}
            />
            <CardGrid
                items={mappedCities}
                id="cities"
                isWithSearch
                searchPlaceholder="Търсене на автогари"
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                hrefPrefix={`/travel/autobuses/${country.slug}`}
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}
