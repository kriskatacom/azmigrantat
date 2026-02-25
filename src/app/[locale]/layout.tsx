import { NextIntlClientProvider, hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/app/providers/theme-provider";
import { ClientOnly } from "@/components/client-only";
import "../globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    if (!hasLocale(routing.locales, locale)) {
        notFound();
    }

    return (
        <html lang={locale} className="light" style={{ colorScheme: "light" }}>
            <body className="bg-slate-100">
                <NextIntlClientProvider>
                    <ThemeProvider
                        attribute="class"
                        forcedTheme="light"
                        defaultTheme="light"
                        enableSystem={false}
                    >
                        <TooltipProvider>{children}</TooltipProvider>
                        <ClientOnly>
                            <Toaster position="top-center" />
                        </ClientOnly>
                    </ThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
