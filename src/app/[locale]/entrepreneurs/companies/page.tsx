import { Metadata } from "next";
import { websiteName } from "@/lib/utils";
import Container from "@/components/entrepreneurs/container";
import { BreadcrumbItem, Breadcrumbs } from "@/components/admin-breadcrumbs";

export const metadata: Metadata = {
    title: websiteName("Компании - Табло за предприемачи"),
};

const breadcrumbs: BreadcrumbItem[] = [
    { name: "Табло", href: "/entrepreneurs" },
    { name: "Компании" }
];

export default async function EntrepreneurCompanies() {
    
    return (
        <Container title="Компании">
            <Breadcrumbs items={breadcrumbs} classes="p-0" />
            <div>Компании</div>
        </Container>
    );
}
