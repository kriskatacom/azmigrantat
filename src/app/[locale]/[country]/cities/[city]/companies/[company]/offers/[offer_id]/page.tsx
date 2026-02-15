import { redirect } from "next/navigation";
import { getCityByColumn } from "@/lib/services/city-service";
import { getCompanyByColumn } from "@/lib/services/companies-service";
import { getCountryByColumn } from "@/lib/services/country-service";
import ShowOffer from "@/app/[locale]/[country]/cities/[city]/companies/[company]/offers/[offer_id]/show-offer";
import { OfferService } from "@/lib/services/offer-service";

type PageProps = {
    params: {
        company: string;
        city: string;
        country: string;
        offer_id: string;
    };
};

const offerService = new OfferService();

export default async function OfferPage({ params }: PageProps) {
    const {
        country: countrySlug,
        city: citySlug,
        company: companySlug,
        offer_id: offerId,
    } = await params;

    const country = await getCountryByColumn("slug", countrySlug);
    if (!country || !country.name) {
        return redirect("/");
    }

    const city = await getCityByColumn("slug", citySlug);
    if (!city || !city.name) {
        return redirect(`/${countrySlug}`);
    }

    const company = await getCompanyByColumn("slug", companySlug);
    if (!company || !company.name) {
        return redirect(`/${countrySlug}/cities/${citySlug}`);
    }

    if (!offerId) {
        return redirect(
            `/${countrySlug}/cities/${citySlug}/companies/${company.slug}`,
        );
    }

    const offer = await offerService.getOfferByColumn("id", offerId);
    if (!offer || !offer.name) {
        return redirect(
            `/${countrySlug}/cities/${citySlug}/companies/${company.slug}`,
        );
    }

    return (
        <main>
            <ShowOffer
                offer={offer}
                company={company}
                companyHref={`/${country.slug}/cities/${city.slug}/companies/${company.slug}`}
            />
        </main>
    );
}