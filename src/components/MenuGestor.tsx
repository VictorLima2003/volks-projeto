"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoVW } from "./LogoVW";
import { SeletorUsuario } from "./SeletorUsuario";
import { cn } from "./ui";

/**
 * Navegação da área do gestor, no topo.
 *
 * Ela já foi horizontal, virou lateral e voltou. A lateral existiu porque a
 * área tinha duas famílias de seção e nove destinos — numa fileira aquilo
 * viraria régua de rolagem. Com pesquisa, regra e simulação de volta para
 * dentro do construtor, sobraram três destinos, e uma coluna de 256px passou a
 * cobrar largura permanente para mostrar três palavras. O construtor de fluxo é
 * quem mais sente: o canvas ganha a faixa inteira.
 *
 * Indicadores saiu daqui porque virou coisa de uma pesquisa só: a soma de duas
 * ofertas em praças diferentes não respondia pergunta que alguém faça. Cada
 * linha da lista de pesquisas leva aos indicadores dela.
 *
 * Sem a palavra "Gestor" ao lado da marca e sem data: quem está aqui dentro já
 * sabe onde está, e o `aria-label` do link continua dizendo para leitor de tela.
 */

const ITENS = [
  { href: "/gestor/pesquisas", label: "Pesquisas" },
  { href: "/gestor/submissoes", label: "Submissões" },
  /*
   * Revisões e Central seguem fora da navegação a pedido — as rotas, as APIs
   * e as travas continuam de pé. Para trazer de volta, basta descomentar.
   */
  // { href: "/gestor/revisoes", label: "Revisões" },
  // { href: "/gestor/central", label: "Central" },
  { href: "/gestor/fontes", label: "Fontes" },
];

export function MenuGestor() {
  const caminho = usePathname();

  return (
    <header className="border-b hairline bg-ink-0 sticky top-0 z-30">
      {/* A mesma caixa do conteúdo, senão a marca fica encostada na borda e
          o menu não alinha com o título logo abaixo. */}
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center gap-8">
        <Link href="/gestor" aria-label="Volkswagen · área do gestor" className="shrink-0">
          <LogoVW decorativo className="w-9 h-9 text-vw-deep" />
        </Link>

        {/* Rola na horizontal só no celular, onde três pílulas não cabem ao lado
            da marca e do perfil. `min-w-0` para o flex deixar encolher. */}
        <nav className="flex-1 min-w-0 overflow-x-auto">
          <ul className="flex items-center gap-1.5">
            {ITENS.map((item) => {
              const ativo = caminho.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={ativo ? "page" : undefined}
                    className={cn(
                      "h-10 inline-flex items-center rounded-full px-4 text-base tracking-tight transition whitespace-nowrap",
                      "outline outline-2 outline-offset-2 outline-transparent focus-visible:outline-vw-blue",
                      ativo
                        ? "bg-vw-deep text-ink-0"
                        : "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0">
          <SeletorUsuario />
        </div>
      </div>
    </header>
  );
}
