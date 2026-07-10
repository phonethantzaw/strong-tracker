import type { Metadata, Viewport } from "next";
import { Anton, Oswald, DM_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConvexClientProvider } from "./providers/ConvexClientProvider";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const oswald = Oswald({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-oswald",
});
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm" });

export const metadata: Metadata = {
  title: "STRONG // Strength Tracker",
  description: "4-day strength program tracker with progressive-overload logging.",
};

export const viewport: Viewport = {
  themeColor: "#0a0b0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body suppressHydrationWarning className={`${anton.variable} ${oswald.variable} ${dmSans.variable} font-sans antialiased`}>
          <ThemeProvider>
            <TooltipProvider>
              <ConvexClientProvider>{children}</ConvexClientProvider>
            </TooltipProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
