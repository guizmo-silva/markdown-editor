import type { Metadata } from "next";
import { Inter, Roboto_Mono, Roboto_Flex } from "next/font/google";
import "./globals.css";
import I18nProvider from "@/components/I18nProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
});

const robotoFlex = Roboto_Flex({
  subsets: ["latin"],
  variable: "--font-roboto-flex",
});

export const metadata: Metadata = {
  title: "Markdown Editor",
  description: "Self-hosted markdown editor with advanced features",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${robotoMono.variable} ${robotoFlex.variable} antialiased`}>
        <ThemeProvider>
          <I18nProvider>{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
