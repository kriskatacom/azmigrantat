import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

export default function NotFound() {
    // Redirect to default locale homepage
    redirect("/");
}
