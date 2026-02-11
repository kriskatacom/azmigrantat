import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getCountryByColumn } from "@/lib/services/country-service";
import { MainNavbar } from "@/components/main-right-navbar";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getEmbassyByColumn } from "@/lib/services/embassy-service";
import { absoluteUrl, websiteName } from "@/lib/utils";
import Hero from "@/app/[locale]/[country]/embassies/[embassy]/hero";
import Description from "@/app/[locale]/[country]/embassies/[embassy]/description";
import ContactsDescription from "@/app/[locale]/[country]/embassies/[embassy]/contacts-description";
import WorkingTime from "@/app/[locale]/[country]/embassies/[embassy]/working-time";
import Emergencies from "@/app/[locale]/[country]/embassies/[embassy]/emergencies";
import Map from "@/components/map";
import PageHeader from "@/components/page-header";
import { getBannerByColumn } from "@/lib/services/banner-service";
import { UserService } from "@/lib/services/user-service";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const countrySlug = (await params).country;
    const embassySlug = (await params).embassy;

    const country = await getCountryByColumn("slug", countrySlug);
    if (!country || !country.name) {
        return redirect("/");
    }

    const embassy = await getEmbassyByColumn("slug", embassySlug);
    if (!embassy || !embassy.name) {
        return redirect("/");
    }

    const embassyName = embassy.name;
    const title = `${embassyName} – адрес, контакти и работно време`;
    const description = `Официална информация за ${embassyName} – адрес, телефон, работно време, карта и полезни указания за граждани и посетители.`;

    const url = `/${country.slug}/embassies/${embassy.slug}`;
    const image = country.image_url
        ? absoluteUrl(country.image_url)
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
                          alt: embassy.heading,
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

type Props = {
    params: Promise<{
        country: string;
        embassy: string;
    }>;
};

export default async function EmbassiesPage({ params }: Props) {
    const userService = new UserService();
    const user = await userService.getCurrentUser();

    const countrySlug = (await params).country;
    const embassySlug = (await params).embassy;

    const country = await getCountryByColumn("slug", countrySlug);
    const embassy = await getEmbassyByColumn("slug", embassySlug);

    const embassyTitle = embassy?.name ?? embassy?.heading;

    if (!country?.name || !embassy || !embassyTitle) {
        return redirect("/");
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: country.name, href: `/${country.slug}` },
        { name: "Посолства", href: `/${country.slug}/embassies` },
        { name: embassyTitle },
    ];

    const banner = await getBannerByColumn(
        "link",
        `/${country.slug}/embassies/${embassySlug}`,
    );

    return (
        <>
            <header>
                <MainNavbar user={user} />
                <Hero embassy={embassy} />
                <PageHeader breadcrumbs={breadcrumbs} banner={banner} />
            </header>

            <main className="md:px-5">
                <div className="grid grid-cols-2 gap-2 m-2">
                    <Description embassy={embassy} />
                    <ContactsDescription embassy={embassy} />
                </div>
                <div className="grid grid-cols-2 gap-2 m-2">
                    <WorkingTime embassy={embassy} />
                    <Emergencies embassy={embassy} />
                </div>
                <Map
                    google_map={embassy.google_map}
                    your_location={embassy.your_location}
                />
            </main>
        </>
    );
}