import { MainNavbar } from "@/components/main-right-navbar";
import { getDriverByColumn } from "@/lib/services/driver-service";
import { redirect } from "next/navigation";
import Hero from "./_components/hero";
import { getCityByColumn } from "@/lib/services/city-service";
import Main from "./_components/main";
import Spacer from "@/components/spacer";

type DriverProfileProps = {
    params: Promise<{
        driver: string;
    }>;
};

export default async function DriverProfile({ params }: DriverProfileProps) {
    const driverSlug = (await params).driver;

    const driver = await getDriverByColumn("slug", driverSlug);

    if (!driver || !driver.from_city_id || !driver.to_city_id) {
        return redirect("/travel/shared-travel");
    }

    const cityFrom = await getCityByColumn("id", driver.from_city_id);
    const cityTo = await getCityByColumn("id", driver.to_city_id);

    if (!cityFrom?.id || !cityTo?.id) {
        return redirect("/travel/shared-travel");
    }

    return (
        <main>
            <MainNavbar />
            <Hero
                driver={driver}
                fromCity={cityFrom}
                toCity={cityTo}
            />
            <Main driver={driver} />
            <Spacer direction="horizontal" />
        </main>
    );
}
