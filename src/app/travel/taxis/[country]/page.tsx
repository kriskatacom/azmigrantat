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
import { City, Country } from "@/lib/types";
import AppImage from "@/components/AppImage";
import { headers } from "next/headers";
import { getBannerByColumn } from "@/lib/services/banner-service";

export async function generateMetadata(): Promise<Metadata> {
    const title = `Таксиметрови компании в Европа – контакти и полезна информация`;
    const description = `Открийте таксиметровите компании в Европа – услуги, адреси и телефони, подредени по държави и градове. Намерете снимки, описания и официални сайтове за бърз и удобен градски транспорт.`;
    const url = "/europe/taxis";

    const image = absoluteUrl("/images/taxis.png") as string;

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
                    alt: "Таксиметрови компании в Европа",
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
            "таксита в Европа",
            "таксиметрови компании",
            "такси услуги Европа",
            "градски транспорт такси",
            "такси телефони Европа",
            "официални таксиметрови компании",
            "такси по държави и градове",
        ],
    };
}

type Props = {
    params: Promise<{
        country: string;
    }>;
};

export default async function TaxisByCountryPage({ params }: Props) {
    const path = new URL((await headers()).get("referer") || "").pathname;
    const banner = await getBannerByColumn("link", path);

    const countrySlug = (await params).country;

    const country = await getCountryByColumn("slug", countrySlug);

    if (!country) {
        return redirect("/travel/trains");
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Таксита", href: country.name },
        { name: `Таксита в ${country.name}` },
    ];

    const cities = await getCities({ column: "country_id", value: country.id });
    const mappedCities: CardEntity[] = cities
        .filter(
            (
                country,
            ): country is City & {
                name: string;
                slug: string;
                image_url: string;
            } => Boolean(country.name && country.slug && country.image_url),
        )
        .map((country) => ({
            name: country.name,
            slug: country.slug,
            imageUrl: country.image_url,
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
            <PageHeader
                title={`Таксита в ${country.name}`}
                breadcrumbs={breadcrumbs}
            />
            <CardGrid
                items={mappedCities}
                id="cities"
                isWithSearch
                searchPlaceholder="Търсене на таксиметрови компании"
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                hrefPrefix={`/travel/taxis/${country.slug}`}
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}
