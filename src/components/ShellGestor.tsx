import { ReactNode } from "react";
import { Corpo } from "./Cabecalho";
import { MenuGestor } from "./MenuGestor";

/**
 * Área do gestor — a única com navegação interna, porque é a única que tem
 * várias seções. Motorista e vendedor são fluxos focados e não têm menu.
 *
 * A navegação voltou para o topo depois que a área encolheu: pesquisa, regras e
 * simulação viraram abas do construtor, e sobraram três destinos. Uma coluna
 * lateral cobrava 256px permanentes para mostrar três palavras — largura que o
 * canvas de fluxo usa melhor.
 *
 * Continua sem rodapé e sem data: com a marca, a navegação e o perfil no topo,
 * a faixa de baixo não tinha o que dizer.
 */
export function ShellGestor({
  title,
  action,
  ajuda,
  telaCheia = false,
  children,
}: {
  title?: string;
  action?: ReactNode;
  /** Explicação da tela, ao lado do título. Ver `AjudaDaTela`. */
  ajuda?: ReactNode;
  /**
   * Entrega a faixa inteira à tela, sem caixa e sem cabeçalho.
   *
   * É para as telas de montagem — o canvas ocupa tudo que houver, e o texto
   * que sobra num container de leitura só empurraria a superfície de trabalho
   * para dentro de uma coluna. O topo segue no mesmo grid do resto.
   */
  telaCheia?: boolean;
  children: ReactNode;
}) {
  if (telaCheia) {
    return (
      <div className="min-h-screen flex flex-col">
        <MenuGestor />
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <MenuGestor />

      <main className="flex-1">
        {/*
         * Mesma caixa das telas de fluxo (`max-w-7xl px-6`): o gestor ocupava a
         * largura inteira da janela, e num monitor grande a linha de texto
         * atravessava a tela — larga demais para ler e desalinhada do resto do
         * produto.
         */}
        <div className="max-w-7xl mx-auto px-6 py-10">
          <Corpo title={title} action={action} ajuda={ajuda}>
            {children}
          </Corpo>
        </div>
      </main>
    </div>
  );
}
