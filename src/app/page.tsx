import Link from "next/link";
import { CreditoTechMeNow } from "@/components/Cabecalho";
import { LogoVW } from "@/components/LogoVW";

/**
 * Raiz: só escolhe a área. Cada perfil tem a sua URL e, a partir dela,
 * não vê as outras — era o cruzamento de visões que gerava confusão.
 *
 * Forma: Marquee Hero. A dobra é uma afirmação e nada mais — sem subtítulo e
 * sem botão, que é a regra do arquétipo. O divisor entre a dobra e o resto é a
 * própria virada de cor (escuro → claro), não um filete.
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
      "Pesquisas, fontes de dados, regras de decisão e indicadores.",
    acento: "bg-ink-900",
  },
];

export default function Raiz() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Dobra. O nav mora dentro dela, transparente sobre o gradiente. */}
      <section className="bg-profundo text-ink-0">
        {/* N9: marca à esquerda, nada no meio. O vazio é o desenho. */}
        <header className="max-w-7xl mx-auto px-6 h-20 flex items-center">
          <LogoVW decorativo className="w-9 h-9 text-ink-0" />
        </header>

        {/* Respiro de baixo maior que o de cima (>= 1.3x) de propósito: padding
            simétrico faz a dobra flutuar solta em vez de puxar a seção seguinte. */}
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-28 md:pb-40">
          {/* A quebra é escolhida, não herdada: as duas frases são o contraste que
              a afirmação faz, e deixar "Não a / tela." partir ao meio o desmancha. */}
          <h1 className="display text-6xl text-ink-0 [overflow-wrap:anywhere]">
            A regra decide.
            <br />
            Não a tela.
          </h1>
        </div>
      </section>

      {/* Abaixo da dobra a página vira outra coisa: um índice das três áreas. */}
      <main className="flex-1 bg-ink-0">
        <div className="max-w-7xl mx-auto px-6">
          <ul>
            {areas.map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className="group grid md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-baseline gap-x-8 gap-y-2 border-b hairline py-8 md:py-10 transition hover:bg-ink-50"
                >
                  <span className="display text-3xl text-ink-900">{a.titulo}</span>
                  <p className="text-base text-ink-700 max-w-2xl">{a.descricao}</p>
                  <span
                    aria-hidden
                    className="hidden md:block text-base text-ink-600 transition group-hover:text-vw-deep"
                  >
                    →
                  </span>
                  {/* O acento não é decoração: repete a cor que identifica a área
                      dentro do produto, para o reconhecimento começar aqui. */}
                  <span className={`md:hidden block h-1 w-12 mt-1 ${a.acento}`} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* Ft2 — uma linha, filete acima. */}
      <footer className="border-t hairline">
        <div className="max-w-7xl mx-auto px-6 min-h-20 py-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-ink-600">
          <span>Volkswagen / Uber</span>
          <CreditoTechMeNow />
        </div>
      </footer>
    </div>
  );
}
