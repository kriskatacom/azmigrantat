import { ReactNode } from "react";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { SidebarToggle } from "@/components/main-sidebar/sidebar-toggle";

type PageHeaderProps = {
    title: string;
    buttonText?: string;
    link?: string;
    children?: ReactNode;
};

export default function PageHeader({
    title,
    buttonText = "Добавяне",
    link = "/",
    children,
}: PageHeaderProps) {
    return (
        <div className="bg-white flex items-center gap-5 border-b p-2 sticky top-0 z-50">
            <SidebarToggle />
            <h1 className="text-2xl font-semibold">{title}</h1>
            <Link href={link}>
                <Button variant={"default"} size={"xl"}>
                    <FiPlus />
                    <span>{buttonText}</span>
                </Button>
            </Link>
            {children}
        </div>
    );
}
