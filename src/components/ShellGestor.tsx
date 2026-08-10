import { ReactNode } from "react";
import { BarraLateral } from "./BarraLateral";
import { Corpo } from "./Cabecalho";

/**
 * Área do gestor — a única com navegação interna, porque é a única que tem
 * várias seções. Motorista e vendedor são fluxos focados e não têm menu.
 *
 * A navegação é lateral desde que a área passou a ter duas famílias de seção:
 * o que é de campanha e o que é do sistema. Numa fileira horizontal os dois
 * grupos viravam uma lista só, e a régua de pílulas já estava no limite.
 *
 * Sem barra de topo e sem rodapé: com a lateral carregando marca, navegação e
 * perfil, as duas faixas horizontais não tinham o que dizer. Sobrava uma o
 * crédito e a outra a data, e as duas roubavam altura de tela de trabalho.
 *
 * O filete navy do topo saiu junto: com a lateral no lugar, ele começava depois
 * dela e lia como um fragmento solto em vez de faixa de marca. A presença da
 * marca agora é a própria barra.
 */
export function ShellGestor({
  title,
  action,
  ajuda,
  children,
}: {
  title?: string;
  action?: ReactNode;
  /** Explicação da tela, ao lado do título. Ver `AjudaDaTela`. */
  ajuda?: ReactNode;
  children: ReactNode;
}) {
  return (
    /*
     * `items-start` para a barra lateral poder ser `sticky`: num flex esticado
     * ela ganha altura total e o `sticky` não tem para onde correr.
     */
    <div className="min-h-screen flex items-start">
      <BarraLateral />

      <div className="flex-1 min-w-0 min-h-screen flex flex-col">
        <main className="flex-1">
          {/*
           * Sem `max-w` e sem centralizar: o conteúdo começa onde a lateral
           * termina. Centralizar aqui abriria uma margem esquerda gigante contra
           * a barra e jogaria o texto para longe do menu que o comanda.
           */}
          <div className="px-8 py-10">
            <Corpo title={title} action={action} ajuda={ajuda}>
              {children}
            </Corpo>
          </div>
        </main>
      </div>
    </div>
  );
}
