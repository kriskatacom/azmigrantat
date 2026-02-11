import { redirect } from "next/navigation";
import { UserService } from "@/lib/services/user-service";
import { MainNavbar } from "@/components/main-right-navbar";
import { LoginForm } from "@/app/[locale]/users/login/login-form";

const userService = new UserService();

export default async function Login() {
    const user = await userService.getCurrentUser();

    if (user) {
        return redirect("/");
    }

    return (
        <main>
            <MainNavbar />
            <LoginForm />
        </main>
    );
}
