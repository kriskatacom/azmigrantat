import { BreadcrumbItem } from "@/components/admin-breadcrumbs";
import { MainNavbar } from "@/components/main-navbar";
import PageHeader from "@/components/page-header";

export default async function AitTickets() {
    const breadcrumbs: BreadcrumbItem[] = [
        { name: "Начало", href: "/" },
        { name: "Пътуване", href: "/travel" },
        { name: "Самолетни билети" },
    ];

    return (
        <>
            <MainNavbar />
            <PageHeader title="Самолетни билети" breadcrumbs={breadcrumbs} />
        </>
    );
}
