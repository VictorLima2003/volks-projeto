"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoVW } from "./LogoVW";
import { SeletorUsuario } from "./SeletorUsuario";
import { cn } from "./ui";

/**
 * Navegação lateral da área do gestor.
 *
 * A forma veio da sidebar do projeto **toven**: marca no topo, menu com grupos,
 * perfil no pé, e um estado recolhido só de ícones. A linguagem visual é a
 * nossa — filete de 1px, navy, Inter, sem caixa alta.
 *
 * Ela substitui o menu horizontal porque a área deixou de caber nele: com a
 * Biblioteca entrando ao lado de Campanhas, Aprovações, Central e Indicadores,
 * a fileira de pílulas viraria uma régua de rolagem lateral. Menu vertical
 * cresce para baixo, que é para onde sobra espaço.
 */

interface Item {
  href: string;
  label: string;
  icone: (p: { className?: string }) => React.ReactElement;
  /** Rota ainda não construída: aparece marcada, não clicável. */
  emBreve?: boolean;
}

interface Grupo {
  /** Sem título, o grupo é a primeira fileira e não leva rótulo. */
  titulo?: string;
  itens: Item[];
}

const MENU: Grupo[] = [
  {
    itens: [
      { href: "/gestor", label: "Campanhas", icone: IconeCampanha },
      { href: "/gestor/aprovacoes", label: "Aprovações", icone: IconeAprovacao },
      { href: "/gestor/central", label: "Central", icone: IconeCentral },
      { href: "/gestor/dashboard", label: "Indicadores", icone: IconeIndicadores },
    ],
  },
  {
    /*
     * O que é do sistema, não da campanha. Está marcado como "em breve" porque
     * hoje esses três moram dentro de cada campanha, copiados — mover para cá é
     * a refatoração de modelo que ainda não foi feita. Prefiro a navegação
     * mostrar o destino e admitir que não chegou lá do que esconder o plano.
     */
    titulo: "Biblioteca",
    itens: [
      { href: "/gestor/fontes", label: "Fontes", icone: IconeFonte, emBreve: true },
      { href: "/gestor/pesquisas", label: "Pesquisas", icone: IconePesquisa, emBreve: true },
      { href: "/gestor/reguas", label: "Réguas", icone: IconeRegua, emBreve: true },
      { href: "/gestor/simulador", label: "Simulador", icone: IconeSimulador, emBreve: true },
    ],
  },
];

export function BarraLateral() {
  const caminho = usePathname();
  const [recolhida, setRecolhida] = useState(false);

  /*
   * "/gestor" casaria com tudo por `startsWith`, então a raiz é comparada por
   * igualdade e o resto por prefixo — é o que mantém "Campanhas" aceso dentro
   * de `/gestor/campanhas/[id]` sem acender junto com "Central".
   */
  const ativo = (href: string) =>
    href === "/gestor"
      ? caminho === "/gestor" || caminho.startsWith("/gestor/campanhas")
      : caminho.startsWith(href);

  return (
    <aside
      className={cn(
        /* `min-w-0`: item de flex tem largura mínima automática igual ao conteúdo, e
           ela vence a largura declarada — a barra recolhia os itens e continuava
           com 256px. */
        "shrink-0 min-w-0 border-r hairline bg-ink-0 flex flex-col sticky top-0 h-screen transition-[width] duration-200 motion-reduce:transition-none",
        /* Degraus da escala, não valor arbitrário: `w-[4.5rem]` não chegou a ser
           gerado pelo Tailwind e a barra ficava com a largura do conteúdo,
           recolhendo os itens sem recolher a si mesma. */
        recolhida ? "w-20" : "w-64",
      )}
    >
      {/* Só a marca. "Gestor" nomeava a área para quem já está dentro dela; o
          `aria-label` do link continua dizendo, para quem usa leitor de tela. */}
      <div className="h-20 flex items-center px-5 border-b hairline shrink-0">
        <Link href="/gestor" aria-label="Volkswagen · área do gestor" className="shrink-0">
          <LogoVW decorativo className="w-9 h-9 text-vw-deep" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-5">
        {MENU.map((grupo, i) => (
          <div key={grupo.titulo ?? i} className={i > 0 ? "mt-7" : ""}>
            {grupo.titulo && !recolhida && (
              <div className="px-5 mb-2 text-xs font-semibold text-ink-600">{grupo.titulo}</div>
            )}
            {/* Recolhida, o filete substitui o rótulo do grupo — sem ele os dois
                blocos viram uma lista só de ícones sem divisão. */}
            {grupo.titulo && recolhida && <div className="mx-5 mb-3 border-t hairline" />}

            <ul className="px-3 space-y-1">
              {grupo.itens.map((item) => (
                <li key={item.href}>
                  <ItemMenu item={item} ativo={ativo(item.href)} recolhida={recolhida} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t hairline p-3 shrink-0 flex flex-col gap-2">
        <div className={recolhida ? "flex justify-center" : ""}>
          <SeletorUsuario compacto={recolhida} />
        </div>
        <button
          type="button"
          onClick={() => setRecolhida((r) => !r)}
          aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
          className="h-9 flex items-center justify-center gap-2 rounded-md text-sm text-ink-600
                     hover:bg-ink-100 hover:text-ink-900 transition
                     outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue"
        >
          <Chevron className={cn("w-4 h-4 shrink-0", recolhida ? "" : "rotate-180")} />
          {!recolhida && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  );
}

function ItemMenu({
  item,
  ativo,
  recolhida,
}: {
  item: Item;
  ativo: boolean;
  recolhida: boolean;
}) {
  const forma =
    "h-11 w-full flex items-center gap-3 rounded-md px-3 text-base tracking-tight transition";

  if (item.emBreve) {
    return (
      <span
        title="Em breve"
        aria-disabled
        className={cn(forma, "text-ink-500 cursor-not-allowed", recolhida && "justify-center px-0")}
      >
        <item.icone className="w-5 h-5 shrink-0" />
        {!recolhida && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {/* Em caixa de frase: a regra 4 vale também para etiqueta pequena. */}
            <span className="text-xs border hairline rounded-full px-2 py-0.5 shrink-0">breve</span>
          </>
        )}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      title={recolhida ? item.label : undefined}
      className={cn(
        forma,
        "outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue",
        ativo ? "bg-vw-deep text-ink-0" : "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
        recolhida && "justify-center px-0",
      )}
    >
      <item.icone className="w-5 h-5 shrink-0" />
      {!recolhida && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

/* Ícones à mão, como o resto do produto — nenhuma biblioteca entra por isto. */
const traco = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconeCampanha({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} {...traco}>
      <path d="M4 9h3l7-4v14l-7-4H4z" />
      <path d="M17.5 9.5a3.5 3.5 0 0 1 0 5" />
    </svg>
  );
}

function IconeAprovacao({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} {...traco}>
      <path d="M5 4h9l5 5v11H5z" />
      <path d="M14 4v5h5" />
      <path d="M8.5 14l2.2 2.2 4.3-4.3" />
    </svg>
  );
}

function IconeCentral({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} {...traco}>
      <path d="M12 3.8L21.2 19.4H2.8L12 3.8z" />
      <path d="M12 10v4" />
      <path d="M12 16.8v.1" />
    </svg>
  );
}

function IconeIndicadores({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} {...traco}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </svg>
  );
}

function IconeFonte({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} {...traco}>
      <ellipse cx="12" cy="6" rx="7.5" ry="3" />
      <path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6" />
      <path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" />
    </svg>
  );
}

function IconePesquisa({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} {...traco}>
      <path d="M5 5h14" />
      <path d="M5 12h9" />
      <path d="M5 19h5" />
      <circle cx="18" cy="17" r="3" />
    </svg>
  );
}

function IconeRegua({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} {...traco}>
      <path d="M3 8h18v8H3z" />
      <path d="M7.5 8v3" />
      <path d="M12 8v4.5" />
      <path d="M16.5 8v3" />
    </svg>
  );
}

function IconeSimulador({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} {...traco}>
      <path d="M9.5 4.5h5" />
      <path d="M12 4.5v5.2L6.4 18a2 2 0 0 0 1.7 3h7.8a2 2 0 0 0 1.7-3L12 9.7" />
      <path d="M8.2 15h7.6" />
    </svg>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} {...traco}>
      <path d="M14.5 6.5L9 12l5.5 5.5" />
    </svg>
  );
}
