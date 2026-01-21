import { Toaster } from "sonner";
import { ThemeProvider } from "@/app/providers/theme-provider";
import { ClientOnly } from "@/components/client-only";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ThemeProvider
            attribute="class"
            forcedTheme="light"
            defaultTheme="light"
            enableSystem={false}
        >
            {children}
            <ClientOnly>
                <Toaster />
            </ClientOnly>
        </ThemeProvider>
    );
}
