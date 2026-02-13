import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ENTREPRENEUR__DASHBOARD_STATS } from "@/lib/constants";
import { websiteName } from "@/lib/utils";
import Container from "@/components/entrepreneurs/container";
import StatItemCard, { StatItemCardProps } from "@/components/stat-item-card";
import { OfferService } from "@/lib/services/offer-service";
import { UserService } from "@/lib/services/user-service";
import { redirect } from "next/navigation";
import { BsBuilding } from "react-icons/bs";
import { MdOutlineWorkOutline } from "react-icons/md";
import { getCompanyCount } from "@/lib/services/companies-service";
import { AdService } from "@/lib/services/ad-service";
import { RiAdvertisementLine } from "react-icons/ri";
import { FcAdvertising } from "react-icons/fc";

export const metadata: Metadata = {
    title: websiteName("Табло за предприемачи"),
};

const userService = new UserService();
const offerService = new OfferService();
const adService = new AdService();

export default async function EntrepreneurDashboard() {
    const user = await userService.getCurrentUser();

    if (!user) {
        return redirect("/");
    }

    const companyCount = await getCompanyCount([
        { column: "user_id", operator: "=", value: user.id },
    ]);

    const offerCount = await offerService.countWithFilters([
        { column: "user_id", operator: "=", value: user.id },
    ]);

    const adCount = await adService.countWithFilters([
        { column: "user_id", operator: "=", value: user.id },
    ]);

    const activeAdCount = await adService.countWithFilters([
        { column: "user_id", operator: "=", value: user.id },
        { column: "status", operator: "=", value: "active" },
    ]);

    const stats: StatItemCardProps[] = [
        {
            title: "Активни реклами",
            icon: FcAdvertising,
            value: activeAdCount,
            href: "/users/entrepreneurs/ads?status=active",
        },
        {
            title: "Реклами",
            icon: RiAdvertisementLine,
            value: adCount,
            href: "/users/entrepreneurs/ads",
        },
        {
            title: "Обяви",
            icon: MdOutlineWorkOutline,
            value: offerCount,
            href: "/users/entrepreneurs/offers",
        },
        {
            title: "Компании",
            icon: BsBuilding,
            value: companyCount,
            href: "/users/entrepreneurs/companies",
        },
    ];

    return (
        <Container title="Табло за предприемачи">
            <div className="p-5 grid gap-5 lg:grid-cols-2 2xl:grid-cols-4">
                {stats.map((item) => (
                    <StatItemCard
                        key={item.href}
                        title={item.title}
                        value={item.value}
                        href={item.href}
                        icon={item.icon}
                    />
                ))}
            </div>
        </Container>
    );
}