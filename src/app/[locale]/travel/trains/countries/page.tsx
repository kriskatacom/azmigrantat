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
    const title = `Железопътен превоз в Европа – влакове, гари и полезна информация`;
    const description = `Разгледайте железопътния превоз в Европа – жп гари, влакове и маршрути, подредени по държави и градове. Намерете адреси, снимки, описания и официални сайтове за пътуване с влак.`;
    const url = "/europe/trains";

    const image = absoluteUrl("/images/trains.png") as string;

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
                    alt: "Железопътен превоз и жп гари в Европа",
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
            "железопътен превоз в Европа",
            "влакове в Европа",
            "жп гари Европа",
            "международни влакове",
            "пътуване с влак в Европа",
            "адреси на жп гари",
            "разписания на влакове Европа",
        ],
    };
}

export default async function TrainsPage() {
    const banner = await getBannerByColumn("link", `/travel/trains/countries`);

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Железопътни гари", href: "/travel/trains" },
        { name: "Железопътни гари по държави" },
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
            image_url: country.image_url,
        }));

    return (
        <>
            <MainNavbar />
            <PageHeader
                title="Железопътни гари по държави"
                breadcrumbs={breadcrumbs}
                banner={banner}
            />
            <CardGrid
                items={mappedCountries}
                id="countries"
                isWithSearch
                searchPlaceholder="Търсене на ЖП гари"
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                hrefPrefix="/travel/trains/countries"
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}
