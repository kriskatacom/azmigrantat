import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getCountryByColumn } from "@/lib/services/country-service";
import { getEmbassies } from "@/lib/services/embassy-service";
import { MainNavbar } from "@/components/main-right-navbar";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { CardGrid } from "@/components/card-grid";
import { CardEntity } from "@/components/card-item";
import { websiteName } from "@/lib/utils";
import PageHeader from "@/components/page-header";
import { getBannerByColumn } from "@/lib/services/banner-service";
import { UserService } from "@/lib/services/user-service";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const countrySlug = (await params).country;
    const country = await getCountryByColumn("slug", countrySlug);

    if (!country || !country.name) {
        return redirect("/");
    }

    const title = `Посолства в ${country.name} | Адреси, контакти и информация`;
    const description = `Пълен списък с посолства в ${country.name} – адреси, телефони, работно време и полезна информация за граждани и пътуващи. Актуални данни на едно място.`;

    const url = `/${country.slug}/embassies`;

    return {
        title: websiteName(title),
        description,

        keywords: [
            `посолства в ${country.name}`,
            `${country.name} посолства`,
            `посолство ${country.name}`,
            `адреси на посолства`,
            `дипломатически мисии`,
            `консулства`,
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

export default async function EmbassiesPage({ params }: Props) {
    const userService = new UserService();
    const user = await userService.getCurrentUser();

    const countrySlug = (await params).country;

    const country = await getCountryByColumn("slug", countrySlug);

    if (!country || !country.name) {
        return redirect("/");
    }

    const embassies = await getEmbassies({
        column: "country_id",
        value: country.id,
    });

    const mappedEmbassies: CardEntity[] = embassies.map((embassy) => ({
        slug: embassy.slug!,
        name: embassy.name!,
        image_url: embassy.image_url!,
        excerpt: embassy.excerpt!,
    }));

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: country.name, href: `/${country.slug}` },
        { name: "Посолства", href: `/${country.slug}/embassies` },
    ];

    const banner = await getBannerByColumn(
        "link",
        `/${country.slug}/embassies`,
    );

    return (
        <>
            <MainNavbar user={user} />

            <PageHeader
                title={`Посолства в ${country.name}`}
                breadcrumbs={breadcrumbs}
                banner={banner}
            />

            <CardGrid
                items={mappedEmbassies}
                id="embassies"
                searchPlaceholder="Търсене на посолства..."
                isWithSearch={true}
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                hrefPrefix={`/${country.slug}/embassies`}
                columns={{ base: 1, sm: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}
