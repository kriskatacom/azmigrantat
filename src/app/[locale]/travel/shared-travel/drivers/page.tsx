import { MainNavbar } from "@/components/main-right-navbar";
import Spacer from "@/components/spacer";
import SharedTravelHero from "@/app/[locale]/travel/shared-travel/_components/hero";
import SharedTravelSearchForm from "@/app/[locale]/travel/shared-travel/_components/search-form";
import DriversGrid from "@/app/[locale]/travel/shared-travel/drivers/drivers-grid";
import { getBannerByColumn } from "@/lib/services/banner-service";
import { getCities, getCityByColumn } from "@/lib/services/city-service";

type DriversProps = {
    searchParams: Promise<{
        from: string;
        to: string;
    }>;
};

export default async function DriversPage({ searchParams }: DriversProps) {
    const { from, to } = await searchParams;

    const heroBanner = await getBannerByColumn("link", "/travel/shared-travel"); // TODO: /travel/shared-travel/drivers

    const cities = await getCities();

    const cityFrom = await getCityByColumn("slug", from ?? "");
    const cityTo = await getCityByColumn("slug", to ?? "");

    return (
        <main>
            <MainNavbar />
            {heroBanner && <SharedTravelHero banner={heroBanner} />}
            <SharedTravelSearchForm
                cities={cities}
                cityFrom={cityFrom}
                cityTo={cityTo}
            />
            <div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-center py-5 md:py-10">
                    Нашите пътешественици
                </h2>
                <DriversGrid />
            </div>
            <Spacer direction="horizontal" size={32} />
        </main>
    );
}