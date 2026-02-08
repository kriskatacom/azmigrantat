import { Metadata } from "next";
import { redirect } from "next/navigation";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { MainNavbar } from "@/components/main-right-navbar";
import PageHeader from "@/components/page-header";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { CardEntity } from "@/components/card-item";
import { getCountryByColumn } from "@/lib/services/country-service";
import { CardGrid } from "@/components/card-grid";
import { Autobus } from "@/lib/types";
import { getCityByColumn } from "@/lib/services/city-service";
import { getAutobuses } from "@/lib/services/autobus-service";
import AppImage from "@/components/AppImage";
import { getBannerByColumn } from "@/lib/services/banner-service";

type Props = {
    params: Promise<{
        country: string;
        city: string;
    }>;
};

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

export default async function Airports({ params }: Props) {
    const countrySlug = (await params).country;
    const citySlug = (await params).city;

    const banner = await getBannerByColumn("link", `/travel/autobuses/countries/${countrySlug}/${citySlug}`);

    const country = await getCountryByColumn("slug", countrySlug);
    const city = await getCityByColumn("slug", citySlug);

    if (!country || !country.name || !city || !city.name) {
        return redirect("/");
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Автогари", href: "/travel/autobuses" },
        { name: "Автогари по държави", href: "/travel/autobuses/countries" },
        { name: `Автогари в ${country.name}`, href: `/travel/autobuses/countries/${country.slug}` },
        { name: city.name }
    ];

    const autobuses = await getAutobuses({
        where: [
            { column: "country_id", value: country.id },
            { column: "city_id", value: city.id },
        ],
    });
    const mappedAutobuses: CardEntity[] = autobuses
        .filter(
            (
                autobus,
            ): autobus is Autobus & {
                name: string;
                website_url: string;
                image_url: string;
            } =>
                Boolean(
                    autobus.name && autobus.website_url && autobus.image_url,
                ),
        )
        .map((autobus) => ({
            name: autobus.name,
            slug: autobus.website_url,
            image_url: autobus.image_url,
            linkType: "external",
        }));

    return (
        <>
            <MainNavbar />
            <PageHeader
                title={`Автогари в ${city.name}`}
                breadcrumbs={breadcrumbs}
                banner={banner}
            />
            <CardGrid
                items={mappedAutobuses}
                id="autobuses"
                isWithSearch
                searchPlaceholder={`Търсене на автогари в ${city.name}, ${country.name}`}
                noItemsMessage={`Няма намерени автогари в ${city.name}.`}
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}
