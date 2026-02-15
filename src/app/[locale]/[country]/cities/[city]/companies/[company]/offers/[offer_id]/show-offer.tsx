import AppImage from "@/components/AppImage";
import { MainNavbar } from "@/components/main-right-navbar";
import { Button } from "@/components/ui/button";
import { Company, Offer } from "@/lib/types";
import Link from "next/link";

export type OfferStatus = "active" | "draft" | "pending" | "canceled";

const statusColors: Record<OfferStatus, string> = {
    active: "bg-green-100 text-green-700",
    draft: "bg-gray-100 text-gray-700",
    pending: "bg-yellow-100 text-yellow-700",
    canceled: "bg-red-100 text-red-700",
};

type ShowOfferProps = {
    offer: Offer;
    company: Company;
    companyHref: string;
};

export default function ShowOffer({
    offer,
    company,
    companyHref,
}: ShowOfferProps) {
    return (
        <main>
            <MainNavbar />
            <div className="max-w-4xl mx-auto lg:py-5">
                <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden border">
                    {offer.image && (
                        <div className="h-56 w-full overflow-hidden">
                            <AppImage
                                src={offer.image}
                                alt={offer.name}
                                fill
                                className="w-full h-full object-cover hover:scale-105 transition duration-300"
                            />
                        </div>
                    )}

                    <div className="py-5 md:p-5 space-y-5">
                        <div className="px-5 flex items-center justify-center gap-5">
                            <span
                                className={`text-xs font-medium px-3 py-1 rounded-full ${statusColors[offer.status]}`}
                            >
                                {offer.status}
                            </span>

                            {offer.created_at && (
                                <span className="text-sm text-gray-400">
                                    {new Date(
                                        offer.created_at,
                                    ).toLocaleDateString()}
                                </span>
                            )}
                            
                            {offer.company_name && (
                                <Button variant={"link"} size={"sm"} asChild>
                                    <Link href={companyHref}>
                                        {company.name}
                                    </Link>
                                </Button>
                            )}
                        </div>

                        <div>
                            <h2 className="text-xl lg:text-2xl font-semibold text-center text-gray-900">
                                {offer.name}
                            </h2>
                            {offer.heading && (
                                <p className="text-sm text-gray-500 mt-1">
                                    {offer.heading}
                                </p>
                            )}
                        </div>

                        {/* Excerpt */}
                        {/* {offer.excerpt && offer.excerpt && (
                            <p className="text-gray-600 line-clamp-3">
                                {offer.exceprt}
                            </p>
                        )} */}

                        {offer.show_description && offer.description && (
                            <div
                                className="text-editor"
                                dangerouslySetInnerHTML={{
                                    __html: offer.description,
                                }}
                            ></div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
