import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getCountryByColumn } from "@/lib/services/country-service";
import { MainNavbar } from "@/components/main-navbar";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getEmbassyByColumn } from "@/lib/services/embassy-service";
import { absoluteUrl, websiteName } from "@/lib/utils";
import Hero from "@/app/[country]/embassies/[embassy]/hero";
import Map from "@/app/[country]/embassies/[embassy]/map";
import Description from "@/app/[country]/embassies/[embassy]/description";
import ContactsDescription from "@/app/[country]/embassies/[embassy]/contacts-description";
import WorkingTime from "@/app/[country]/embassies/[embassy]/working-time";
import Emergencies from "@/app/[country]/embassies/[embassy]/emergencies";

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

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: country.name, href: `/${country.slug}` },
        { name: "Посолства", href: `/${country.slug}/embassies` },
        { name: embassy.name },
    ];

    return (
        <>
            <header>
                <MainNavbar />
                <Hero embassy={embassy} />
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
                <Map embassy={embassy} />
            </main>
        </>
    );
}