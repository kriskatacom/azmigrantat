import { Metadata } from "next";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { MainNavbar } from "@/components/main-navbar";
import PageHeader from "@/components/page-header";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { CardGrid } from "@/components/card-grid";
import { CardEntity } from "@/components/card-item";
import { getCountries } from "@/lib/services/country-service";

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

export default async function AutobusesPage() {
    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Автобуси" },
    ];

    const countries = await getCountries();
    const mappedCountries: CardEntity[] = countries
        .filter(
            (
                country,
            ): country is {
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
            <PageHeader title="Автобуси" breadcrumbs={breadcrumbs} />
            <CardGrid
                items={mappedCountries}
                id="countries"
                isWithSearch
                searchPlaceholder="Търсене на държави"
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                hrefPrefix="/travel/autobuses"
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}