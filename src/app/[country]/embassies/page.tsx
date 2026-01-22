import { redirect } from "next/navigation";
import { getCountryBySlug } from "@/lib/services/country-service";
import { getEmbassies } from "@/lib/services/embassy-service";
import { MainNavbar } from "@/components/main-navbar";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import { CardGrid } from "@/components/card-grid";
import { CardEntity } from "@/components/card-item";

type Props = {
    params: Promise<{
        country: string;
    }>;
};

export default async function EmbassiesPage({ params }: Props) {
    const countrySlug = (await params).country;

    const country = await getCountryBySlug(countrySlug);

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
        imageUrl: embassy.image_url!,
        excerpt: embassy.excerpt!,
    }));

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: country.name, href: `/${country.slug}` },
        { name: "Посолства", href: `/${country.slug}/embassies` },
    ];

    return (
        <>
            <MainNavbar />

            <div className="text-center bg-website-menu-item py-5 xl:py-10">
                <h1 className="text-light text-2xl xl:text-3xl 2xl:text-4xl font-bold uppercase">
                    Посолства в {country.name}
                </h1>

                <div className="text-white text-lg flex justify-center">
                    <Breadcrumbs items={breadcrumbs} />
                </div>
            </div>

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
