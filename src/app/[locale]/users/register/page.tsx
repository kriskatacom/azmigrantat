import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { UserService } from "@/lib/services/user-service";
import { absoluteUrl, websiteName } from "@/lib/utils";
import ClientOnly from "./client-only";

type PageProps = {
    params: Promise<{ locale: string }>;
};

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { locale } = await params;

    const t = await getTranslations({
        locale,
        namespace: "metadata.registerPage",
    });

    const url =
        locale === "bg" ? "/users/register" : `/${locale}/users/register`;

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

export default async function Register() {
    const user = await userService.getCurrentUser();

    if (user) {
        return redirect("/");
    }

    return (
        <main>
            <ClientOnly />
        </main>
    );
}