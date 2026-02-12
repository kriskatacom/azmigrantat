import Link from "next/link";
import { IconType } from "react-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type StatItemCardProps = {
    title: string;
    value: string | number;
    href?: string;
    icon: IconType;
};

export default function StatItemCard({
    title,
    value,
    href,
    icon: Icon,
}: StatItemCardProps) {
    const content = (
        <Card className="group hover:shadow-lg transition-all duration-300 rounded-md border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm md:text-base font-medium text-muted-foreground">
                    {title}
                </CardTitle>

                <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
            </CardHeader>

            <CardContent>
                <div className="text-2xl md:text-3xl font-bold tracking-tight">
                    {value}
                </div>
            </CardContent>
        </Card>
    );

    if (href) {
        return (
            <Link href={href} title={title} className="block">
                {content}
            </Link>
        );
    }

    return content;
}