import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getCountryByColumn } from "@/lib/services/country-service";
import { MainNavbar } from "@/components/main-navbar";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import Hero from "@/app/[country]/landmarks/[landmark]/hero";
import { getLandmarkByColumn } from "@/lib/services/landmark-service";
import DisplayGallery from "@/app/[country]/landmarks/[landmark]/display-gallery";
import Description from "@/app/[country]/landmarks/[landmark]/description";
import ContactsDescription from "@/app/[country]/landmarks/[landmark]/contacts-description";
import { websiteName } from "@/lib/utils";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const countrySlug = (await params).country;
    const landmarkSlug = (await params).landmark;

    const country = await getCountryByColumn("slug", countrySlug);
    if (!country || !country.name) {
        return redirect("/");
    }

    const landmark = await getLandmarkByColumn("slug", landmarkSlug);
    if (!landmark || !landmark.name) {
        return redirect("/");
    }

    const landmarkName = landmark.name;
    const title = `${landmarkName} – забележителност в ${country.name}`;
    const description = `Информация за ${landmarkName} в ${country.name} – описание, снимки, карта, как да стигнете и полезни съвети за посетители.`;

    const url = `/${country.slug}/landmarks/${landmark.slug}`;
    const image = landmark.image_url;

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
                          alt: landmarkName,
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
        landmark: string;
    }>;
};

export default async function EmbassiesPage({ params }: Props) {
    const countrySlug = (await params).country;
    const landmarkSlug = (await params).landmark;

    const country = await getCountryByColumn("slug", countrySlug);

    if (!country || !country.name) {
        return redirect("/");
    }

    const landmark = await getLandmarkByColumn("slug", landmarkSlug);

    if (!landmark || !landmark.name) {
        return redirect("/");
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: country.name, href: `/${country.slug}` },
        { name: "Забележителнисти", href: `/${country.slug}/landmarks` },
        { name: landmark.name },
    ];

    const additionalImages: string[] = JSON.parse(
        landmark.additional_images || "",
    );

    return (
        <>
            <header>
                <MainNavbar />
                <Hero landmark={landmark} breadcrumbs={breadcrumbs} />
            </header>

            <main className="md:px-5">
                {landmark.google_map && (
                    <div className="w-full h-100 rounded-md overflow-hidden border max-lg:hidden">
                        <h2 className="text-white bg-website-dark text-2xl font-semibold text-center p-5">
                            Как да стигнете до там?
                        </h2>

                        <iframe
                            src={landmark.google_map}
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    </div>
                )}

                <div className="grid xl:grid-cols-3 gap-5 my-5">
                    {landmark.content && <Description landmark={landmark} />}

                    <DisplayGallery
                        additionalImages={additionalImages}
                        landmark={landmark}
                    />

                    {landmark.contacts_content && (
                        <ContactsDescription landmark={landmark} />
                    )}
                </div>

                {landmark.google_map && (
                    <div className="w-full h-100 rounded-md overflow-hidden border lg:hidden">
                        <h2 className="text-white bg-website-dark text-2xl font-semibold text-center p-5">
                            Как да стигнете до там?
                        </h2>

                        <iframe
                            src={landmark.google_map}
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
