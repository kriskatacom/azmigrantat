import { Metadata } from "next";
import Link from "next/link";
import { BsBuilding } from "react-icons/bs";
import { RiAdvertisementLine } from "react-icons/ri";
import { MdOutlineWorkOutline } from "react-icons/md";
import { FcAdvertising } from "react-icons/fc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { websiteName } from "@/lib/utils";
import Container from "@/components/entrepreneurs/container";

export const metadata: Metadata = {
    title: websiteName("Табло за предприемачи"),
};

const stats = [
    {
        title: "Активни реклами",
        value: "1",
        icon: FcAdvertising,
        href: "/entrepreneurs/ads?status=active",
    },
    {
        title: "Реклами",
        value: "3",
        icon: RiAdvertisementLine,
        href: "/entrepreneurs/ads",
    },
    {
        title: "Обяви",
        value: "1",
        icon: MdOutlineWorkOutline,
        href: "/entrepreneurs/offers",
    },
    {
        title: "Компании",
        value: "1",
        icon: BsBuilding,
        href: "/entrepreneurs/companies",
    },
];

export default async function EntrepreneurDashboard() {
    return (
        <Container title="Табло за предприемачи">
            <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-4">
                {stats.map((item, index) => {
                    const Icon = item.icon;

                    return (
                        <Link key={index} href={item.href} title={item.title}>
                            <Card className="hover:shadow-lg transition-shadow duration-300 rounded-md">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-xl md:text-2xl font-medium text-muted-foreground">
                                        {item.title}
                                    </CardTitle>
                                    <div className="p-2 rounded-lg bg-muted">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {item.value}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
            </div>
        </Container>
    );
}
