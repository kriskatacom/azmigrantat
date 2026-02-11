import { Metadata } from "next";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { MainNavbar } from "@/components/main-right-navbar";
import PageHeader from "@/components/page-header";
import { absoluteUrl, websiteName } from "@/lib/utils";
import { CardGrid } from "@/components/card-grid";
import { getBannerByColumn } from "@/lib/services/banner-service";
import { AUTOBUSES_PAGE_ITEMS } from "@/lib/constants";
import { UserService } from "@/lib/services/user-service";

export async function generateMetadata(): Promise<Metadata> {
    const title = `Автобусни гари и автобусни превози в Европа – информация и адреси`;
    const description = `Открийте автобусни гари и автобусни превози в Европа, подредени по държави и градове. Ще намерите имена, адреси, снимки, описания и полезна информация за пътуване с автобус.`;
    const url = "/europe/autobuses";

    const image = absoluteUrl("/images/autobuses.png") as string;

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
                    alt: "Автобусни гари и автобусни превози в Европа",
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
            "автобуси в Европа",
            "автобусни гари Европа",
            "автобусни превози Европа",
            "международни автобуси",
            "адреси на автобусни гари",
            "пътуване с автобус в Европа",
            "автобуси по държави и градове",
        ],
    };
}

export default async function AutobusesPage() {
    const userService = new UserService();
    const user = await userService.getCurrentUser();
    
    const banner = await getBannerByColumn("link", `/travel/autobuses`);

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Автобуси" },
    ];

    return (
        <>
            <MainNavbar user={user} />
            <PageHeader
                title="Автобуси"
                breadcrumbs={breadcrumbs}
                banner={banner}
            />
            <CardGrid
                items={AUTOBUSES_PAGE_ITEMS}
                id="countries"
                loadMoreStep={8}
                initialVisible={8}
                variant="standart"
                hrefPrefix="/travel/autobuses"
                columns={{ base: 1, md: 2, lg: 3, xl: 4 }}
            />
        </>
    );
}
