import { redirect } from "next/navigation";
import { MainNavbar } from "@/components/main-right-navbar";
import { RegisterForm } from "@/app/[locale]/users/register/register-form";
import { UserService } from "@/lib/services/user-service";

const userService = new UserService();

export default async function Register() {
    const user = await userService.getCurrentUser();

    if (user) {
        return redirect("/");
    }

    return (
        <main>
            <MainNavbar />
            <RegisterForm />
        </main>
    );
}
