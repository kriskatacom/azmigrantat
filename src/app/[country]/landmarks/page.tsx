import { redirect } from "next/navigation";
import { MainNavbar } from "@/components/main-navbar";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import { CardGrid } from "@/components/card-grid";
import { CardEntity } from "@/components/card-item";
import { getCountryByColumn } from "@/lib/services/country-service";
import { getLandmarks } from "@/lib/services/landmark-service";

type Props = {
    params: Promise<{
        country: string;
    }>;
};

export default async function LandmarksPage({ params }: Props) {
    const countrySlug = (await params).country;

    const country = await getCountryByColumn("slug", countrySlug);

    if (!country || !country.name) {
        return redirect("/");
    }

    const landmarks = await getLandmarks({
        column: "country_id",
        value: country.id,
    });

    const mappedLandmarks: CardEntity[] = landmarks.map((landmark) => ({
        slug: landmark.slug!,
        name: landmark.name!,
        imageUrl: landmark.image_url!,
        excerpt: landmark.excerpt!,
    }));

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: country.name, href: `/${country.slug}` },
        { name: "Забележителности", href: `/${country.slug}/landmarks` },
    ];

    return (
        <>
            <MainNavbar />

            <div className="text-center bg-website-menu-item py-5 xl:py-10">
                <h1 className="text-light text-2xl xl:text-3xl 2xl:text-4xl font-bold uppercase">
                    Забележителности в {country.name}
                </h1>

                <div className="text-white text-lg flex justify-center">
                    <Breadcrumbs items={breadcrumbs} />
                </div>
            </div>

            <CardGrid
                items={mappedLandmarks}
                id="landmarks"
                searchPlaceholder="Търсене на забележителности..."
                isWithSearch={true}
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                hrefPrefix={`/${country.slug}/landmarks`}
                columns={{ base: 1, sm: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}
