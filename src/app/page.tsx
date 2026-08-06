import Link from "next/link";
import { LogoVW } from "@/components/LogoVW";

/**
 * Raiz: só escolhe a área. Cada perfil tem a sua URL e, a partir dela,
 * não vê as outras — era o cruzamento de visões que gerava confusão.
 */
const areas = [
  {
    href: "/motorista",
    titulo: "Motorista",
    descricao:
      "Confirme seu CPF, autorize a consulta e responda o essencial. A resposta sai na hora.",
    acento: "bg-vw-deep",
  },
  {
    href: "/vendedor",
    titulo: "Vendedor",
    descricao:
      "Consulte um CPF e veja se o pedido está liberado, bloqueado ou em análise — com o motivo.",
    acento: "bg-signal-go",
  },
  {
    href: "/gestor",
    titulo: "Gestor",
    descricao:
      "Campanhas, pesquisa, regras de elegibilidade, aprovações e indicadores.",
    acento: "bg-ink-900",
  },
];

export default function Raiz() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-1 bg-vw-deep" />

      <main className="flex-1 flex items-center">
        <div className="max-w-5xl mx-auto px-6 py-20 w-full">
          <LogoVW decorativo className="w-14 h-14 text-vw-deep" />

          <h1 className="display text-3xl md:text-4xl mt-10 max-w-2xl">
            Elegibilidade Uber × Volkswagen
          </h1>
          <p className="text-lg text-ink-700 mt-5 max-w-xl">Escolha por onde entrar.</p>

          <div className="grid md:grid-cols-3 gap-4 mt-14">
            {areas.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group border hairline rounded-md overflow-hidden bg-ink-0 hover:border-vw-deep hover:shadow-lift transition flex flex-col"
              >
                <div className={`h-1 ${a.acento}`} />
                <div className="p-7 flex flex-col flex-1">
                  <span className="display text-3xl">{a.titulo}</span>
                  <p className="text-base text-ink-700 mt-4 leading-relaxed flex-1">
                    {a.descricao}
                  </p>
                  <span className="mt-8 text-xs uppercase tracking-widest text-ink-600 group-hover:text-vw-deep transition">
                    Entrar →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t hairline">
        <div className="max-w-5xl mx-auto px-6 h-20 flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-widest text-ink-600">
          <span>Protótipo · dados em memória</span>
          <span>Wolks</span>
        </div>
      </footer>
    </div>
  );
}
