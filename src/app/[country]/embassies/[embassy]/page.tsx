import { redirect } from "next/navigation";
import { getCountryByColumn } from "@/lib/services/country-service";
import { MainNavbar } from "@/components/main-navbar";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getEmbassyByColumn } from "@/lib/services/embassy-service";
import ClientPage from "@/app/[country]/embassies/[embassy]/hero";
import ContactsDescription from "./contacts-description";
import Description from "./description";

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

                <ClientPage embassy={embassy} />

                <div className="bg-white text-website-dark text-center py-5 xl:py-10 border-b">
                    <h1 className="text-2xl xl:text-3xl 2xl:text-4xl font-bold uppercase">
                        {embassy.heading ? embassy.heading : embassy.name}
                    </h1>

                    <div className="text-lg flex justify-center">
                        <Breadcrumbs items={breadcrumbs} />
                    </div>
                </div>
            </header>

            <main className="container mx-auto md:px-5">
                {embassy.google_map && (
                    <div className="w-full h-100 rounded-md overflow-hidden border max-lg:hidden">
                        <h2 className="text-white bg-website-dark text-2xl font-semibold text-center p-5">
                            Как да стигнете до там?
                        </h2>

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
                
                <div className="grid lg:grid-cols-2 gap-5 my-5">
                    {embassy.content && (
                        <Description embassy={embassy} />
                    )}

                    {embassy.contacts_content && (
                        <ContactsDescription embassy={embassy} />
                    )}
                </div>

                {embassy.google_map && (
                    <div className="w-full h-100 rounded-md overflow-hidden border lg:hidden">
                        <h2 className="text-white bg-website-dark text-2xl font-semibold text-center p-5">
                            Как да стигнете до там?
                        </h2>

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