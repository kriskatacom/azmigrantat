import { Metadata } from "next";
import { redirect } from "next/navigation";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { MainNavbar } from "@/components/main-right-navbar";
import PageHeader from "@/components/page-header";
import {
    buildCategoryBreadcrumbs,
    getCategoryByColumn,
    getCategoryParentSlugs,
    getCategoryTree,
} from "@/lib/services/category-service";
import { getCityByColumn } from "@/lib/services/city-service";
import { getCompanyByColumn } from "@/lib/services/companies-service";
import { getCountryByColumn } from "@/lib/services/country-service";
import CustomHeader from "@/app/[locale]/[country]/cities/[city]/companies/[company]/custom-header";
import SectionCard from "@/app/[locale]/[country]/cities/[city]/companies/[company]/section-card";
import AppImage from "@/components/AppImage";
import Map from "@/components/map";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { UserService } from "@/lib/services/user-service";

type PageProps = {
    params: Promise<{
        company: string;
        city: string;
        country: string;
    }>;
};

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const {
        country: countrySlug,
        city: citySlug,
        company: companySlug,
    } = await params;

    // Проверка за country
    const country = await getCountryByColumn("slug", countrySlug);
    if (!country || !country.name) {
        return redirect("/");
    }

    // Проверка за city
    const city = await getCityByColumn("slug", citySlug);
    if (!city || !city.name) {
        return redirect(`/${countrySlug}`);
    }

    // Проверка за company
    const company = await getCompanyByColumn("slug", companySlug);
    if (!company || !company.name) {
        return redirect(`/${countrySlug}/cities/${citySlug}`);
    }

    const companyName = company.name;
    const title = `${companyName} – ${city.name}, ${country.name}`;
    const description = `Информация за ${companyName} в ${city.name}, ${country.name} – контакти, услуги и полезни указания.`;

    const url = `/${country.slug}/cities/${city.slug}/${company.slug}`;
    const image = company.image_url
        ? absoluteUrl(company.image_url)
        : undefined;

    return {
        title: websiteName(title),
        description,

        alternates: {
            canonical: url,
        },

        openGraph: {
            title: websiteName(title),
            description,
            url,
            siteName: websiteName(),
            locale: "bg_BG",
            type: "article",
            images: image
                ? [
                      {
                          url: image,
                          width: 1200,
                          height: 630,
                          alt: companyName,
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

export default async function CompanyPage({ params }: PageProps) {
    const userService = new UserService();
    const user = await userService.getCurrentUser();

    const {
        country: countrySlug,
        city: citySlug,
        company: companySlug,
    } = await params;

    const country = await getCountryByColumn("slug", countrySlug);
    const city = await getCityByColumn("slug", citySlug);
    const company = await getCompanyByColumn("slug", companySlug);
    const category = await getCategoryByColumn("id", company?.category_id ?? 0);

    if (
        !country ||
        !country.name ||
        !city ||
        !city.name ||
        !company ||
        !company.name ||
        !category ||
        !category.name
    ) {
        return redirect(`/${companySlug}/cities/${citySlug}`);
    }

    const baseCityHref = `/${countrySlug}/cities/${citySlug}`;
    const categorySlugs = await getCategoryParentSlugs(category.id);
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
        { name: company.name },
    ];

    const activeBanner = { id: 1, image: company.image_url, height: 600 };

    return (
        <main>
            <MainNavbar user={user} />
            <PageHeader title={company.name} breadcrumbs={breadcrumbs} />
            <CustomHeader
                title={company.name}
                banner={activeBanner}
                description={company.description}
            />
            <div className="container mx-auto relative grid md:grid-cols-2 gap-5 max-md:p-5 md:my-5">
                <SectionCard
                    title="Качване на обява"
                    buttonText="Публикуване на обява"
                    content="Публикувай безплатно обява за продажба на метали. Свържи се с много купувачи!"
                    imageSrc={company.offer_image_url}
                    companyName={company.name}
                    className="rounded-lg overflow-hidden"
                />
                <SectionCard
                    title="Рекламиране"
                    buttonText="Научете повече"
                    content="Рекламирайте бизнеса си при нас и постигнете широка аудитория. Увеличете продажбите си!"
                    imageSrc={company.ads_image_url}
                    companyName={company.name}
                    className="rounded-lg overflow-hidden"
                />
            </div>
            <div className="relative w-full overflow-hidden rounded">
                <img
                    src={company.bottom_image_url}
                    alt={company.name ?? "section image"}
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 z-10" />
                <div className="relative z-20">
                    <div className="container mx-auto py-16 max-lg:p-5">
                        {company.excerpt && (
                            <div
                                className="text-white space-y-5 text-lg"
                                dangerouslySetInnerHTML={{
                                    __html: company.excerpt,
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {company.google_map && company.your_location && (
                <Map
                    google_map={company.google_map}
                    your_location={company.your_location}
                />
            )}
        </main>
    );
}
