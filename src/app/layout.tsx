import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Avisos } from "@/components/Avisos";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Volkswagen · Motor de Elegibilidade",
  description:
    "Plataforma para construir pesquisas com lógica condicional e decisão automatizada: campanhas, hooks de dados, motor de regras versionadas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      {/* Os avisos vivem na raiz: qualquer tela do produto pode disparar um, e a
          pilha precisa sobreviver à troca de rota. */}
      <body className="min-h-screen bg-ink-0 text-ink-900 antialiased">
        <Avisos>{children}</Avisos>
      </body>
    </html>
  );
}
