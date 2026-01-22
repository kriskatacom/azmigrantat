import { redirect } from "next/navigation";
import { getCountryByColumn } from "@/lib/services/country-service";
import { MainNavbar } from "@/components/main-navbar";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";
import ClientPage from "@/app/[country]/landmarks/[landmark]/client-page";
import { getLandmarkByColumn } from "@/lib/services/landmark-service";
import DisplayGallery from "@/app/[country]/landmarks/[landmark]/display-gallery";

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

                <ClientPage landmark={landmark} />

                <div className="bg-white text-website-dark text-center pb-5 border-b">
                    <div className="text-lg flex justify-center">
                        <Breadcrumbs items={breadcrumbs} classes="justify-center" />
                    </div>
                </div>
            </header>

            <main className="grid xl:grid-cols-3 gap-5 my-5 md:px-5">
                {landmark.content && (
                    <div className="bg-white border rounded-md h-fit overflow-hidden">
                        <h2 className="text-white bg-website-dark text-2xl font-semibold mb-5 p-5">
                            Информация за посолството
                        </h2>
                        <div
                            className="text-editor"
                            dangerouslySetInnerHTML={{
                                __html: landmark.content as string,
                            }}
                        ></div>
                    </div>
                )}

                <DisplayGallery
                    additionalImages={additionalImages}
                    landmark={landmark}
                />

                {landmark.contacts_content && (
                    <div className="bg-white border rounded-md h-fit overflow-hidden">
                        <h2 className="text-white bg-website-dark text-2xl font-semibold mb-5 p-5">
                            Информация за контакти
                        </h2>
                        <div
                            className="text-editor"
                            dangerouslySetInnerHTML={{
                                __html: landmark.contacts_content as string,
                            }}
                        ></div>
                    </div>
                )}
            </main>
        </>
    );
}
