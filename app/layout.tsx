import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "react-toastify/dist/ReactToastify.css";
import "flatpickr/dist/themes/light.css";
import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

/**
 * Root layout (Gap Analysis Part Q).
 *
 * Converted from a client component to a server component so that:
 *   - next/font actually loads Inter (the old `font-inter` class referenced
 *     a font that was never fetched — dead declaration),
 *   - next-themes can hydrate with an inline no-flash script,
 *   - metadata can be exported.
 * DashCode template body classes are preserved: bespoke template CSS still
 * keys off `custom-tippy` and `dashcode-app`.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "4 Our Life — Admin",
  description: "4 Our Life health platform administration",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-inter custom-tippy dashcode-app`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>{children}</QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
