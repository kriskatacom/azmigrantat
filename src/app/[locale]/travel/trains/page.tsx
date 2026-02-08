import { Metadata } from "next";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { MainNavbar } from "@/components/main-right-navbar";
import PageHeader from "@/components/page-header";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { CardGrid } from "@/components/card-grid";
import { getBannerByColumn } from "@/lib/services/banner-service";
import { TRAINS_PAGE_ITEMS } from "@/lib/constants";

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
    const banner = await getBannerByColumn("link", `/travel/trains`);

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Влакове" },
    ];

    return (
        <>
            <MainNavbar />
            <PageHeader
                title="Влакове"
                breadcrumbs={breadcrumbs}
                banner={banner}
            />
            <CardGrid
                items={TRAINS_PAGE_ITEMS}
                id="countries"
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                hrefPrefix="/travel/trains"
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}
