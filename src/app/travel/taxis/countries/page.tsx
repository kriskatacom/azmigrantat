import { Metadata } from "next";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { MainNavbar } from "@/components/main-navbar";
import PageHeader from "@/components/page-header";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { CardGrid } from "@/components/card-grid";
import { CardEntity } from "@/components/card-item";
import { getCountries } from "@/lib/services/country-service";
import { Country } from "@/lib/types";
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

export default async function TaxisPage() {
    const banner = await getBannerByColumn("link", `/travel/taxis/countries`);

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Таксита", href: "/travel/taxis" },
        { name: "Таксиметрови компании по държави" },
    ];

    const countries = await getCountries();
    const mappedCountries: CardEntity[] = countries
        .filter(
            (
                country,
            ): country is Country & {
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
            <PageHeader
                title="Таксиметрови компании по държави"
                breadcrumbs={breadcrumbs}
                banner={banner}
            />
            <CardGrid
                items={mappedCountries}
                id="countries"
                isWithSearch
                searchPlaceholder="Търсене на държави"
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                hrefPrefix="/travel/taxis/countries"
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}
