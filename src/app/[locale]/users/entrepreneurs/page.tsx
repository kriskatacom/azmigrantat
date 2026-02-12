import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ENTREPRENEUR__DASHBOARD_STATS } from "@/lib/constants";
import { websiteName } from "@/lib/utils";
import Container from "@/components/entrepreneurs/container";
import StatItemCard from "@/components/stat-item-card";

export const metadata: Metadata = {
    title: websiteName("Табло за предприемачи"),
};

export default async function EntrepreneurDashboard() {
    return (
        <Container title="Табло за предприемачи">
            <div className="p-5 grid gap-5 lg:grid-cols-2 2xl:grid-cols-4">
                {ENTREPRENEUR__DASHBOARD_STATS.map((item) => (
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
