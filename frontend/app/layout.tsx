import type { Metadata } from "next";
import { Inter, Roboto_Mono, Roboto_Flex, Noto_Sans_SC } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import I18nProvider from "@/components/I18nProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast/Toast";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-roboto-mono",
});

const robotoFlex = Roboto_Flex({
  subsets: ["latin", "cyrillic"],
  variable: "--font-roboto-flex",
});

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-sc",
});

export const metadata: Metadata = {
  title: "Markdown Editor",
  description: "Self-hosted markdown editor with advanced features",
  icons: {
    icon: [
      { url: '/favicon-32x32.svg', sizes: '32x32', type: 'image/svg+xml' },
      { url: '/favicon-16x16.svg', sizes: '16x16', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${robotoMono.variable} ${robotoFlex.variable} ${notoSansSC.variable} antialiased`}>
        <Script src="/runtime-config.js" strategy="beforeInteractive" />
        <ThemeProvider>
          <ToastProvider>
            <I18nProvider>{children}</I18nProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
