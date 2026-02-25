import { redirect } from "next/navigation";
import { MainNavbar } from "@/components/main-right-navbar";
import { getDriverByColumn } from "@/lib/services/driver-service";
import Hero from "@/app/[locale]/travel/shared-travel/[driver]/_components/hero";
import { getCityByColumn } from "@/lib/services/city-service";
import Main from "@/app/[locale]/travel/shared-travel/[driver]/_components/main";
import Spacer from "@/components/spacer";
import { UserService } from "@/lib/services/user-service";
import AdministrationDialog from "@/app/[locale]/travel/shared-travel/[driver]/administration/_components/administration-dialog";

type DriverProfileProps = {
    params: Promise<{
        driver: string;
    }>;
};

const userService = new UserService();

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

    const user = await userService.getCurrentUser();

    return (
        <main>
            <MainNavbar user={user} />
            <Hero driver={driver} fromCity={cityFrom} toCity={cityTo} />
            {user && driver.user_id === user.id && (
                <AdministrationDialog driver={driver} />
            )}
            <Main driver={driver} />
            <Spacer direction="horizontal" />
        </main>
    );
}
