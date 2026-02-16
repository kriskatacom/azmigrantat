import { redirect } from "next/navigation";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { CardGrid } from "@/components/card-grid";
import { MainNavbar } from "@/components/main-right-navbar";
import PageHeader from "@/components/page-header";
import { getBannerByColumn } from "@/lib/services/banner-service";
import {
    buildCategoryBreadcrumbs,
    getCategories,
    getCategoryByColumn,
    getCategoryTree,
} from "@/lib/services/category-service";
import { getCityByColumn } from "@/lib/services/city-service";
import { getCountryByColumn } from "@/lib/services/country-service";
import { Banner, Company, Offer } from "@/lib/types";
import { getCompanies } from "@/lib/services/companies-service";
import { UserService } from "@/lib/services/user-service";
import ImageSlider, { Slide } from "./image-slider";
import { OfferService } from "@/lib/services/offer-service";

type PageProps = {
    params: Promise<{
        country: string;
        city: string;
        categories: string[];
    }>;
    searchParams: Promise<{
        by: string;
    }>;
};

export default async function Categories({ params, searchParams }: PageProps) {
    const userService = new UserService();
    const user = await userService.getCurrentUser();

    const {
        country: countrySlug,
        city: citySlug,
        categories: categorySlugs,
    } = await params;
    const { by } = await searchParams;
    const lastCategorySlug = categorySlugs[categorySlugs.length - 1];

    const category = await getCategoryByColumn("slug", lastCategorySlug);
    const city = await getCityByColumn("slug", citySlug);
    const country = await getCountryByColumn("slug", countrySlug);
    const baseCityHref = `/${countrySlug}/cities/${citySlug}`;

    if (
        !country ||
        !country.name ||
        !city ||
        !city.name ||
        !category ||
        !category.name
    ) {
        return redirect("/");
    }

    const categories = await getCategories({
        where: { parent_id: category.id },
    });

    const companies: Company[] =
        categories.length === 0
            ? await getCompanies({
                  where: [
                      { column: "city_id", value: city.id },
                      { column: "category_id", value: category.id },
                  ],
              })
            : [];

    const categoriesTree = await getCategoryTree();

    const categoryBreadcrumbs = buildCategoryBreadcrumbs(
        categoriesTree,
        categorySlugs,
        baseCityHref,
    );

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: country.name, href: `/${countrySlug}` },
        { name: "Градове", href: `/${countrySlug}/cities` },
        { name: city.name, href: `/${countrySlug}/cities/${citySlug}` },
        ...categoryBreadcrumbs.map((b, index) =>
            index === categoryBreadcrumbs.length - 1 ? { name: b.name } : b,
        ),
    ];

    let activeBanner: Banner | null;

    if (category.image_url) {
        activeBanner = {
            id: 1,
            image: category.image_url,
            height: 300,
            name: "",
            show_name: false,
            show_description: false,
            show_overlay: false,
            show_button: false,
            content_place: "center_center",
        };
    } else {
        const categorySlugs = categoryBreadcrumbs.map((x) => x.href);
        activeBanner = await getBannerByColumn(
            "link",
            `/${countrySlug}/cities/${citySlug}/${categorySlugs.join("/")}`,
        );

        // Ако getBannerByColumn може да върне null, добави fallback
        if (!activeBanner) {
            activeBanner = {
                id: 0,
                image: null,
                height: 300,
                name: "",
                show_name: false,
                show_description: false,
                show_overlay: false,
                show_button: false,
                content_place: "center_center",
            };
        }
    }

    const offerService = new OfferService();

    const offers =
        by === "city"
            ? await offerService.getAll({
                  countryId: country.id,
                  cityId: city.id,
                  categoryId: category.id,
                  status: "active",
              })
            : await offerService.getAll({
                  countryId: country.id,
                  categoryId: category.id,
                  status: "active",
              });

    const offersSlides: Slide[] = offers.map((offer: Offer) => ({
        id: offer.id,
        title: offer.name,
        description: offer.content ?? offer.description ?? "",
        image: offer.image ?? "",
        url: `${baseCityHref}/companies/${offer.company_slug}/offers/${offer.id}`,
    }));

    return (
        <main>
            <MainNavbar user={user} />
            {offersSlides.length > 0 && (
                <ImageSlider
                    title={`Обяви (${category.name})`}
                    slides={offersSlides}
                    cityName={city.name}
                    countryName={country.name}
                />
            )}
            <PageHeader
                title={`Информационен справочник на ${city.name}`}
                breadcrumbs={breadcrumbs}
                banner={activeBanner}
            />
            {categories.length > 0 ? (
                <CardGrid
                    id="categories"
                    isWithSearch
                    searchPlaceholder={`Търсене на категории в ${category.name}`}
                    items={categories}
                    variant="standart"
                    columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
                    hrefPrefix={`/${countrySlug}/cities/${citySlug}/${category.slug}`}
                />
            ) : (
                <CardGrid
                    id="companies"
                    isWithSearch
                    searchPlaceholder={`Търсене на компании в ${city.name}`}
                    items={companies}
                    variant="standart"
                    columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
                    hrefPrefix={`/${countrySlug}/cities/${citySlug}/companies`}
                />
            )}
        </main>
    );
}