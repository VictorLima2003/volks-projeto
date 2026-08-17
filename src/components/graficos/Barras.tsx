import { Fatia } from "@/lib/analise";
import { Desfecho } from "@/lib/types";
import { coresDe, numero, percentual, SLOT1 } from "./paleta";
import { linhasDeDistribuicao, TabelaDoGrafico } from "./TabelaDoGrafico";

/**
 * Barras horizontais — a leitura por ranking.
 *
 * HTML com `div`, não SVG: barra horizontal é um retângulo com um rótulo ao
 * lado, e em HTML o rótulo quebra linha, trunca e é selecionável; dentro do SVG
 * cada uma dessas coisas vira conta de coordenada.
 *
 * **Uma cor para todas as barras.** A versão anterior dava um degrau de azul a
 * cada categoria, o que é o anti-padrão de rampa de valor em categoria nominal:
 * gasta o único canal livre repetindo o que o comprimento já diz, e reprova nos
 * testes de paleta por construção. Categoria com polaridade — desfecho, efeito —
 * continua colorida, porque ali a cor **significa**.
 *
 * A barra é proporcional ao **maior valor**, não ao total: quando a primeira
 * fatia tem 8%, a régua sobre o total desenha oito riscos indistinguíveis, e a
 * pergunta que a barra responde é "qual é o maior". A fração sobre o total fica
 * escrita ao lado, para as duas leituras caberem no mesmo desenho.
 */
export function Barras({
  fatias,
  desfechos,
  mostrarPercentual = true,
  maximo,
  rotuloDaCategoria = "Categoria",
}: {
  fatias: Fatia[];
  desfechos?: Desfecho[];
  mostrarPercentual?: boolean;
  /** Escala imposta de fora, para dois gráficos irmãos serem comparáveis. */
  maximo?: number;
  rotuloDaCategoria?: string;
}) {
  if (fatias.length === 0) {
    return <p className="text-sm text-ink-600">Nada para mostrar neste recorte.</p>;
  }

  const cores = coresDe(
    fatias.map((f) => f.rotulo),
    desfechos,
  );
  const teto = Math.max(1, maximo ?? Math.max(...fatias.map((f) => f.n), 0));

  return (
    <div>
      <ul className="space-y-3.5">
        {fatias.map((f) => (
          <li key={f.rotulo}>
            <div className="flex items-baseline justify-between gap-4 mb-1.5">
              <span className="text-sm text-ink-700 truncate" title={f.rotulo}>
                {f.rotulo}
              </span>
              {/* Valor na ponta da barra: é o que substitui o eixo aqui. */}
              <span className="shrink-0 flex items-baseline gap-2">
                <span className="mono text-sm text-ink-900">{numero(f.n)}</span>
                {mostrarPercentual && (
                  <span className="mono text-xs text-ink-600 w-12 text-right">
                    {percentual(f.fracao)}
                  </span>
                )}
              </span>
            </div>
            {/* Trilho um tom fora da superfície; a barra assenta na esquerda e
                arredonda só a ponta que cresce. */}
            <div className="h-2.5 bg-ink-200 rounded-sm overflow-hidden">
              <div
                className="h-full rounded-r-[4px]"
                style={{
                  /* Piso de 2%: com a proporção pura, um registro num recorte de
                     quinhentos vira zero pixel — e some justamente o caso raro
                     que alguém foi procurar. */
                  width: `${f.n > 0 ? Math.max((f.n / teto) * 100, 2) : 0}%`,
                  backgroundColor: cores[f.rotulo] ?? SLOT1,
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      <TabelaDoGrafico
        colunas={[rotuloDaCategoria, "Submissões", "Fatia"]}
        linhas={linhasDeDistribuicao(fatias)}
      />
    </div>
  );
}

/**
 * Colunas verticais — o histograma de um fato numérico.
 *
 * Vertical porque a faixa tem ordem natural, e o olho lê ordem no eixo
 * horizontal. Ranking é horizontal; distribuição é vertical.
 *
 * **Só a faixa mais alta leva número escrito.** Um valor em cima de cada uma das
 * oito colunas é a definição de "número em todo ponto": ninguém lê os oito, e
 * eles disputam com a forma que é o assunto. O resto está na tabela.
 */
export function Colunas({
  faixas,
  cor = SLOT1,
  rotuloDaFaixa = "Faixa",
}: {
  faixas: { rotulo: string; n: number }[];
  cor?: string;
  rotuloDaFaixa?: string;
}) {
  if (faixas.length === 0) {
    return <p className="text-sm text-ink-600">Nada para mostrar neste recorte.</p>;
  }

  const teto = Math.max(1, ...faixas.map((f) => f.n));
  const resumo = faixas.map((f) => `${f.rotulo}: ${numero(f.n)}`).join("; ");

  return (
    <div>
      <div role="img" aria-label={resumo}>
        <div className="flex items-end gap-1.5 h-36">
          {faixas.map((f) => (
            <div key={f.rotulo} className="flex-1 flex flex-col justify-end h-full min-w-0">
              <span className="mono text-xs text-ink-700 text-center mb-1 truncate">
                {f.n === teto ? numero(f.n) : ""}
              </span>
              <div
                className="rounded-t-[4px] w-full"
                style={{
                  height: `${f.n > 0 ? Math.max((f.n / teto) * 100, 1.5) : 0}%`,
                  backgroundColor: cor,
                }}
              />
            </div>
          ))}
        </div>
        {/* Filete do eixo: sem ele as colunas flutuam e a base fica ambígua. */}
        <div className="border-t hairline-strong mt-0 pt-1.5 flex gap-1.5">
          {faixas.map((f) => (
            <span
              key={f.rotulo}
              className="flex-1 mono text-[0.65rem] leading-tight text-ink-600 text-center truncate min-w-0"
              title={f.rotulo}
            >
              {f.rotulo}
            </span>
          ))}
        </div>
      </div>

      <TabelaDoGrafico
        colunas={[rotuloDaFaixa, "Submissões"]}
        linhas={faixas.map((f) => [f.rotulo, f.n])}
      />
    </div>
  );
}
