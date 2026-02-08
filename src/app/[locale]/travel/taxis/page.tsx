import { Metadata } from "next";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { MainNavbar } from "@/components/main-right-navbar";
import PageHeader from "@/components/page-header";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { CardGrid } from "@/components/card-grid";
import { getBannerByColumn } from "@/lib/services/banner-service";
import { AUTOBUSES_PAGE_ITEMS, TAXIS_PAGE_ITEMS } from "@/lib/constants";

export async function generateMetadata(): Promise<Metadata> {
    const title = `Таксиметрови компании в Европа – контакти и полезна информация`;
    const description = `Открийте таксиметровите компании в Европа – услуги, адреси и телефони, подредени по държави и градове. Намерете снимки, описания и официални сайтове за бърз и удобен градски транспорт.`;
    const url = "/europe/taxis";

    const image = absoluteUrl("/images/taxis.png") as string;

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
                    alt: "Таксиметрови компании в Европа",
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
            "таксита в Европа",
            "таксиметрови компании",
            "такси услуги Европа",
            "градски транспорт такси",
            "такси телефони Европа",
            "официални таксиметрови компании",
            "такси по държави и градове",
        ],
    };
}

export default async function TaxisPage() {
    const banner = await getBannerByColumn("link", `/travel/taxis`);

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Таксита" },
    ];

    return (
        <>
            <MainNavbar />
            <PageHeader
                title="Таксита"
                breadcrumbs={breadcrumbs}
                banner={banner}
            />
            <CardGrid
                items={TAXIS_PAGE_ITEMS}
                id="private-taxis"
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                hrefPrefix="/travel/taxis"
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}
