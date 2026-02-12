import { ReactNode } from "react";
import PageHeader from "@/components/entrepreneurs/page-header";

type ContainerProps = {
    title: string;
    children: ReactNode;
};

export default function Container({ title, children }: ContainerProps) {
    return (
        <div className="flex flex-1 flex-col">
            <PageHeader title={title} />
            <main className="flex-1 p-5 space-y-5">{children}</main>
        </div>
    );
}
