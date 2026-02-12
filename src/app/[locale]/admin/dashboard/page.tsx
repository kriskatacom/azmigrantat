import { Metadata } from "next";
import { redirect } from "next/navigation";
import { websiteName } from "@/lib/utils";
import { UserService } from "@/lib/services/user-service";
import PageHeader from "@/components/admin/page-header";

export const metadata: Metadata = {
    title: websiteName("Табло"),
};

export default async function Dashboard() {
    const userService = new UserService();
    const user = await userService.getCurrentUser();

    if (!user) {
        return redirect("/users/login");
    }

    return (
        <main className="flex-1">
            <PageHeader title="Табло" buttonHide />
        </main>
    );
}