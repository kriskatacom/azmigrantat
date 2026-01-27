import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getCountryByColumn } from "@/lib/services/country-service";
import { MainNavbar } from "@/components/main-navbar";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getEmbassyByColumn } from "@/lib/services/embassy-service";
import ContactsDescription from "@/app/[country]/embassies/[embassy]/contacts-description";
import Description from "@/app/[country]/embassies/[embassy]/description";
import { absoluteUrl, websiteName } from "@/lib/utils";
import Hero from "@/app/[country]/embassies/[embassy]/hero";

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
                <Hero embassy={embassy} breadcrumbs={breadcrumbs} />
            </header>

            <main className="container mx-auto md:px-5">
                <div className="grid lg:grid-cols-2 gap-5 my-5">
                    {embassy.content && embassy.image_url && (
                        <Description
                            embassy={embassy}
                            image={
                                embassy.description_image_url ??
                                embassy.image_url
                            }
                        />
                    )}

                    {embassy.contacts_content && (
                        <ContactsDescription
                            embassy={embassy}
                            image="/images/contacts.webp"
                        />
                    )}
                </div>

                {embassy.google_map && (
                    <div className="w-full h-100 rounded-md overflow-hidden border mb-5">
                        <div className="text-white bg-website-dark p-5 text-center">
                            <h2 className="text-2xl font-semibold">
                                Как да стигнете до там?
                            </h2>
                            {embassy.your_location && embassy.your_location && (
                                <div className="text-lg mt-3 space-x-2">
                                    <span>Вашето местоположение:</span>
                                    <a
                                        href={embassy.your_location}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-website-light hover:underline"
                                    >
                                        Упътване
                                    </a>
                                </div>
                            )}
                        </div>

                        <iframe
                            src={embassy.google_map}
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    </div>
                )}
            </main>
        </>
    );
}
