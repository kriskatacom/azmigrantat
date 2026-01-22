import { redirect } from "next/navigation";
import { getCountryBySlug } from "@/lib/services/country-service";
import { MainNavbar } from "@/components/main-navbar";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import { getEmbassyByColumn } from "@/lib/services/embassy-service";
import ClientPage from "@/app/[country]/embassies/[embassy]/client-page";

type Props = {
    params: Promise<{
        country: string;
        embassy: string;
    }>;
};

export default async function EmbassiesPage({ params }: Props) {
    const countrySlug = (await params).country;
    const embassySlug = (await params).embassy;

    const country = await getCountryBySlug(countrySlug);

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

            <main className="container mx-auto grid lg:grid-cols-2 gap-5 my-5 md:px-5">
                {embassy.content && (
                    <div className="bg-white border rounded-md h-fit overflow-hidden">
                        <h2 className="text-white bg-website-dark text-2xl font-semibold mb-5 p-5">
                            Информация за посолството
                        </h2>
                        <div
                            className="text-editor"
                            dangerouslySetInnerHTML={{
                                __html: embassy.content as string,
                            }}
                        ></div>
                    </div>
                )}

                {embassy.contacts_content && (
                    <div className="bg-white border rounded-md h-fit overflow-hidden">
                        <h2 className="text-white bg-website-dark text-2xl font-semibold mb-5 p-5">
                            Информация за контакти
                        </h2>
                        <div
                            className="text-editor"
                            dangerouslySetInnerHTML={{
                                __html: embassy.contacts_content as string,
                            }}
                        ></div>
                    </div>
                )}
            </main>
        </>
    );
}