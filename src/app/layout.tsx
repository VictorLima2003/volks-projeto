import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Wolks · Motor de Elegibilidade Uber × Volkswagen",
  description:
    "Plataforma de jornadas de elegibilidade: campanhas, base Uber, motor de regras e decisão comercial.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen bg-ink-0 text-ink-900 antialiased">{children}</body>
    </html>
  );
}
