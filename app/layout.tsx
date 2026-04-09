import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";


export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Smart Forward",
  description: "AI-Powered Smile Design",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`font-sans antialiased`}
      >
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
