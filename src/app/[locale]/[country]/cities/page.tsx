import { redirect } from "next/navigation";
import { Metadata } from "next";
import { MainNavbar } from "@/components/main-navbar";
import { CardGrid } from "@/components/card-grid";
import { getCountryByColumn } from "@/lib/services/country-service";
import { getCities } from "@/lib/services/city-service";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/[locale]/[country]/cities/client-page";
import BulgariaCitiesMap from "@/app/[locale]/[country]/cities/bulgaria-cities-map";
import { CardEntity } from "@/components/card-item";
import { absoluteUrl, websiteName } from "@/lib/utils";
import PageHeader from "@/components/page-header";

type PageProps = {
    params: Promise<{
        country: string;
    }>;
};

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const countrySlug = (await params).country;
    const country = await getCountryByColumn("slug", countrySlug);

    if (!country || !country.name) {
        return redirect("/");
    }

    const title = `Градове в ${country.name} | Информация и карта`;
    const description = `Разгледай градовете в ${country.name} – основни населени места, карта, полезна информация и интересни факти.`;

    const url = `/${country.slug}/cities`;
    const image = country.image_url
        ? absoluteUrl(country.image_url)
        : undefined;

    return {
        title: websiteName(title),
        description,

        keywords: [
            `градове в ${country.name}`,
            `${country.name} градове`,
            `карта на ${country.name}`,
            `населени места в ${country.name}`,
        ],

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
            images: image
                ? [
                      {
                          url: image,
                          width: 1200,
                          height: 630,
                          alt: `Градове в ${country.name}`,
                      },
                  ]
                : undefined,
        },

        twitter: {
            card: "summary_large_image",
            title: websiteName(title),
            description,
            images: image ? [image] : undefined,
        },
    };
}

export default async function CitiesPage({ params }: PageProps) {
    const countrySlug = (await params).country;

    const country = await getCountryByColumn("slug", countrySlug);

    if (!country || !country.name) {
        return redirect("/");
    }

    const cities = await getCities({ column: "country_id", value: country.id });

    const mappedCities: CardEntity[] = cities.map((city) => ({
        slug: city.slug!,
        name: city.name!,
        imageUrl: city.image_url!,
        excerpt: city.excerpt!,
    }));

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: country.name, href: `/${country.slug}` },
        { name: "Градове", href: `/${country.slug}/cities` },
    ];

    const isBulgaria = country.slug === "bulgaria";

    return (
        <>
            <MainNavbar />

            <PageHeader
                title={`Градове в ${country.name}`}
                breadcrumbs={breadcrumbs}
            />

            <ClientPage country={country} />

            {!isBulgaria && cities.length > 0 && (
                <CardGrid
                    items={mappedCities}
                    searchPlaceholder="Търсене на градове..."
                    id="cities"
                    isWithSearch={true}
                    loadMoreStep={6}
                    initialVisible={9}
                    hrefPrefix={`/${country.slug}/cities`}
                    variant="modern"
                    columns={{ base: 1, sm: 2, xl: 3 }}
                />
            )}

            {!isBulgaria && cities.length === 0 && (
                <div className="py-5 xl:py-10 text-center text-xl font-semibold">
                    Няма намерени градове в {country.name}.
                </div>
            )}

            {isBulgaria && (
                <>
                    <h2 className="text-2xl lg:text-3xl xl:text-4xl font-semibold text-center my-5 xl:py-10">
                        Кликнете върху желания град
                    </h2>
                    <BulgariaCitiesMap />
                </>
            )}
        </>
    );
}
