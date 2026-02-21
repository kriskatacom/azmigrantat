import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { UserService } from "@/lib/services/user-service";
import { MainNavbar } from "@/components/main-right-navbar";
import { LoginForm } from "@/app/[locale]/users/login/login-form";
import { absoluteUrl, websiteName } from "@/lib/utils";
import LoginAnimation from "@/app/[locale]/users/_components/login-animation";

type PageProps = {
    params: Promise<{ locale: string }>;
};

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { locale } = await params;

    const t = await getTranslations({
        locale,
        namespace: "metadata.loginPage",
    });

    const url = locale === "bg" ? "/users/login" : `/${locale}/users/login`;

    const image = absoluteUrl("/images/og-auth.jpg") as string;

    return {
        title: websiteName(t("title")),
        description: t("description"),

        alternates: {
            canonical: absoluteUrl(url),
        },

        robots: {
            index: false,
            follow: false,
        },

        openGraph: {
            title: websiteName(t("title")),
            description: t("description"),
            url: absoluteUrl(url),
            siteName: websiteName(),
            locale: locale === "bg" ? "bg_BG" : "en_US",
            type: "website",
            images: [
                {
                    url: image,
                    width: 1200,
                    height: 630,
                    alt: t("title"),
                },
            ],
        },

        twitter: {
            card: "summary_large_image",
            title: websiteName(t("title")),
            description: t("description"),
            images: [image],
        },
    };
}

const userService = new UserService();

export default async function Login() {
    const user = await userService.getCurrentUser();

    if (user) {
        return redirect("/");
    }

    return (
        <main className="relative min-h-screen bg-slate-950 overflow-x-hidden">
            <LoginAnimation />

            <div className="relative z-20">
                <MainNavbar />
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center lg:justify-between max-w-7xl mx-auto px-4 py-16 gap-16 min-h-[calc(100vh-80px)]">
                <div className="text-center lg:text-left max-w-lg">
                    <h1 className="text-5xl font-extrabold text-emerald-500 mb-4 drop-shadow-md">
                        Аз мигрантът
                    </h1>
                    <p className="text-lg text-emerald-100/80 mb-6">
                        Добре дошли! Влезте в профила си, за да управлявате
                        обяви, услуги и съдържание.
                    </p>
                </div>

                <div className="w-full max-w-md backdrop-blur-sm shadow-2xl rounded-2xl p-8 border border-white/10">
                    <h2 className="text-2xl font-bold mb-5 text-center text-light">
                        Вход в профила
                    </h2>
                    <LoginForm />
                </div>
            </div>
        </main>
    );
}