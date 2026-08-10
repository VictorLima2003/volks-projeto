import { ReactNode } from "react";
import { MarcaCabecalho } from "./MarcaCabecalho";
import { SeletorUsuario } from "./SeletorUsuario";
import { Corpo, Rodape } from "./Cabecalho";

/**
 * Cromo mínimo para as áreas de fluxo (motorista e vendedor): só a marca.
 * Sem menu — quem está preenchendo ou consultando não escolhe seção,
 * segue um caminho. A navegação acontece por migalha e por link contextual.
 */
export function ShellFluxo({
  area,
  title,
  action,
  saudacao,
  data,
  dataCabecalho,
  seletorDeUsuario = false,
  topo,
  largura = "larga",
  rodapeColado = false,
  cabecalho = true,
  children,
}: {
  /**
   * Destino do clique na marca. O `label` não é mais escrito na tela — só
   * nomeia o link para leitor de tela, que sem ele ouviria "Volkswagen" três
   * vezes e não saberia para onde cada uma leva.
   */
  area: { label: string; href: string };
  title?: string;
  action?: ReactNode;
  /**
   * Saudação e data, na faixa acima do título — o mesmo arranjo de painel do
   * `ShellGestor`, porque a home do vendedor é um painel como os dele.
   */
  saudacao?: string;
  data?: string;
  /**
   * Data na barra da marca, à direita, em vez de na faixa de saudação. É onde
   * ela incomoda menos numa tela que já usa a primeira linha do conteúdo para
   * cumprimentar pelo nome — duas linhas de contexto seguidas empurrariam o
   * trabalho da tela para baixo.
   */
  dataCabecalho?: string;
  /**
   * Troca de pessoa no cabeçalho. Ligado só onde a identidade muda o que a tela
   * faz — o vendedor, cuja carteira e autoria dependem de quem está logado.
   * Desligado na área do respondente, que não tem login nenhum.
   */
  seletorDeUsuario?: boolean;
  /**
   * Faixa de largura total, renderizada antes do container. Existe para a dobra
   * com gradiente sangrar até a borda da tela: o truque de `-mx-6` só desfaz o
   * padding, não o `max-w`, e `w-screen` conta a barra de rolagem e sobra.
   */
  topo?: ReactNode;
  /**
   * A escolha segue o formato da tarefa, não a área do produto:
   * "estreita" (672px, 1 coluna) é pra telas de captura de campo — uma pergunta por vez, sem mais
   * nada na tela (hoje só `/motorista/jornada`). Aqui a largura estreita é o conteúdo inteiro.
   * "larga" (1280px) é pra telas de avaliar informação e decidir — o mesmo container de
   * `ShellGestor` ("padrao"), de propósito: vendedor e a home do motorista usam esta opção porque
   * têm mais de uma coisa pra mostrar (KPI, cards, "como funciona"), igual a um dashboard.
   */
  largura?: "larga" | "estreita";
  /**
   * O respiro acima do rodapé serve para separá-lo de conteúdo em papel branco.
   * Quando a página termina numa seção sangrada, ele vira uma faixa solta.
   */
  rodapeColado?: boolean;
  /**
   * `false` quando a própria faixa de `topo` carrega a marca — é o caso de uma
   * dobra que ocupa a tela inteira, onde uma barra branca acima só roubaria
   * altura da dobra para repetir o que já está dentro dela.
   */
  cabecalho?: boolean;
  children?: ReactNode;
}) {
  if (!cabecalho) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          {topo}
          {children ? (
            <div
              className={
                largura === "estreita"
                  ? "max-w-2xl mx-auto px-6 py-6"
                  : "max-w-7xl mx-auto px-6 py-10"
              }
            >
              <Corpo
                saudacao={saudacao}
                data={data}
                title={title}
                action={action}
              >
                {children}
              </Corpo>
            </div>
          ) : null}
        </main>
        <Rodape colado={rodapeColado} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-1 bg-vw-deep" />

      {/*
       * O container do cabeçalho acompanha o do conteúdo. Enquanto era sempre
       * 1280px, a marca ficava colada na borda esquerda da tela e o
       * questionário centrado a 672px no meio — dois eixos diferentes na mesma
       * página, que é o que lia como "fora de grid".
       */}
      <header className="border-b hairline bg-ink-0">
        <div
          className={
            largura === "estreita"
              ? "max-w-2xl mx-auto px-6 h-20 flex items-center"
              : "max-w-7xl mx-auto px-6 h-20 flex items-center"
          }
        >
          <MarcaCabecalho href={area.href} rotulo={area.label} />
          <div className="ml-auto flex items-center gap-6">
            {dataCabecalho && <span className="text-sm text-ink-600">{dataCabecalho}</span>}
            {seletorDeUsuario && <SeletorUsuario />}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {topo}
        {/* Sem corpo, o container só produziria uma faixa vazia entre a dobra e
            o rodapé. Uma tela pode ser só a faixa de topo. */}
        {children ? (
          <div
            className={
              largura === "estreita"
                ? "max-w-2xl mx-auto px-6 py-6"
                : "max-w-7xl mx-auto px-6 py-10"
            }
          >
            <Corpo
              saudacao={saudacao}
              data={data}
              title={title}
              action={action}
            >
              {children}
            </Corpo>
          </div>
        ) : null}
      </main>

      <Rodape colado={rodapeColado} />
    </div>
  );
}
