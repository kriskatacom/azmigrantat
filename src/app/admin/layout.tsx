import { Toaster } from "sonner";
import { ThemeProvider } from "@/app/providers/theme-provider";
import { ClientOnly } from "@/components/client-only";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            {children}
            <ClientOnly>
                <Toaster />
            </ClientOnly>
        </ThemeProvider>
    );
}
