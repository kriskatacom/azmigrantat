import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getCountryByColumn } from "@/lib/services/country-service";
import { MainNavbar } from "@/components/main-navbar";
import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import Hero from "@/app/[country]/landmarks/[landmark]/hero";
import { getLandmarkByColumn } from "@/lib/services/landmark-service";
import { absoluteUrl, websiteName } from "@/lib/utils";
import Map from "./map";
import Description from "./description";
import ContactsDescription from "./contacts-description";
import WorkingTime from "./working-time";
import Tickets from "./tickets";
import DisplayGallery from "./display-gallery";

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
    const image = landmark.image_url
        ? absoluteUrl(landmark.image_url)
        : undefined;

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
                <Hero landmark={landmark} />
            </header>

            <main className="md:px-5">
                <div className="grid grid-cols-2 gap-2 m-2">
                    <Description landmark={landmark} />
                    <DisplayGallery
                        additionalImages={additionalImages}
                        landmark={landmark}
                    />
                </div>

                <div className="grid grid-cols-2 gap-2 m-2">
                    <WorkingTime landmark={landmark} />
                    <Tickets landmark={landmark} />
                </div>

                <Map landmark={landmark} />
            </main>
        </>
    );
}