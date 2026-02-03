import { Metadata } from "next";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { MainNavbar } from "@/components/main-navbar";
import PageHeader from "@/components/page-header";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { CardGrid } from "@/components/card-grid";
import { CardEntity } from "@/components/card-item";
import { getCountries } from "@/lib/services/country-service";
import { Country } from "@/lib/types";

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
    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Круизи" },
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
            <PageHeader title="Круизи" breadcrumbs={breadcrumbs} />
            <CardGrid
                items={mappedCountries}
                id="countries"
                isWithSearch
                searchPlaceholder="Търсене на круизни компании"
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                hrefPrefix="/travel/cruises"
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}
