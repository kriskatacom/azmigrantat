import { ReactNode } from "react";
import EntrepreneurLeftSidebar from "@/components/entrepreneurs/entrepreneur-sidebar";
import PageHeader from "@/components/entrepreneurs/page-header";

type EntrepreneurLayoutProps = {
    children: ReactNode;
};

export default function EntrepreneurLayout({
    children,
}: EntrepreneurLayoutProps) {
    return (
        <div className="flex min-h-screen">
            <EntrepreneurLeftSidebar />

            <div className="flex flex-1 flex-col">
                <PageHeader />
                <main className="flex-1 p-5">{children}</main>
            </div>
        </div>
    );
}