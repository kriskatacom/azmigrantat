import "./globals.css";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="bg" suppressHydrationWarning>
            <body suppressHydrationWarning className="bg-background">
                {children}
            </body>
        </html>
    );
}
