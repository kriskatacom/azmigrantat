import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import { MainNavbar } from "@/components/main-navbar";
import PageHeader from "@/components/page-header";
import { getBannerByColumn } from "@/lib/services/banner-service";
import {
    getCategoryByColumn,
    getCategoryTree,
} from "@/lib/services/category-service";
import { getCityByColumn } from "@/lib/services/city-service";
import { getCompanyByColumn } from "@/lib/services/companies-service";
import { getCountryByColumn } from "@/lib/services/country-service";
import { buildCategoryBreadcrumbs, websiteName } from "@/lib/utils";
import { redirect } from "next/navigation";
import CustomHeader from "./custom-header";
import AppImage from "@/components/AppImage";
import { Button } from "@/components/ui/button";

type PageProps = {
    params: Promise<{
        company: string;
        city: string;
        country: string;
    }>;
};

export default async function CompanyPage({ params }: PageProps) {
    const {
        country: countrySlug,
        city: citySlug,
        company: companySlug,
    } = await params;

    const country = await getCountryByColumn("slug", countrySlug);
    const city = await getCityByColumn("slug", citySlug);
    const company = await getCompanyByColumn("slug", companySlug);

    if (
        !country ||
        !country.name ||
        !city ||
        !city.name ||
        !company ||
        !company.name
    ) {
        return redirect(`/${companySlug}/cities/${citySlug}`);
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: country.name, href: `/${countrySlug}` },
        { name: "Градове", href: `/${countrySlug}/cities` },
        { name: city.name, href: `/${countrySlug}/cities/${citySlug}` },
    ];

    const activeBanner = { id: 1, image: company.imageUrl, height: 600 };
    const uploadOffer = JSON.parse(company.additional_images)[0];

    return (
        <main>
            <MainNavbar />
            <PageHeader
                title={`Градове в ${country.name}`}
                breadcrumbs={breadcrumbs}
            />
            <CustomHeader
                title={company.name}
                banner={activeBanner}
                breadcrumbs={breadcrumbs}
            />
            <div className="container mx-auto relative grid md:grid-cols-2 gap-5 max-md:p-5">
                <div className="relative w-full h-60 lg:h-100 shrink-0">
                    {uploadOffer ? (
                        <AppImage
                            src={uploadOffer}
                            alt={websiteName(company.name)}
                            fill
                            className="object-cover rounded w-full h-full"
                        />
                    ) : (
                        <div className="bg-gray-600 w-full h-full flex justify-center items-center text-light text-2xl">
                            Няма поставено изображение
                        </div>
                    )}
                    <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-center items-center gap-5">
                        <h2 className="max-lg:text-center text-light text-2xl xl:text-3xl 2xl:text-5xl font-bold uppercase px-5">
                            Качване на обява
                        </h2>
                        <Button variant={"default"} size={"xl"}>
                            Публикуване на обява
                        </Button>
                    </div>
                </div>
                <div className="relative w-full h-60 lg:h-100 shrink-0">
                    {uploadOffer ? (
                        <AppImage
                            src={uploadOffer}
                            alt={websiteName(company.name)}
                            fill
                            className="object-cover rounded w-full h-full"
                        />
                    ) : (
                        <div className="bg-gray-600 w-full h-full flex justify-center items-center text-light text-2xl">
                            Няма поставено изображение
                        </div>
                    )}
                    <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-center items-center gap-5">
                        <h2 className="max-lg:text-center text-light text-2xl xl:text-3xl 2xl:text-5xl font-bold uppercase px-5">
                            Рекламиране
                        </h2>
                        <Button variant={"default"} size={"xl"}>
                            Научете повече
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
}
