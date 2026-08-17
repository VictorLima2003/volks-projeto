import { Fatia } from "@/lib/analise";
import { Desfecho } from "@/lib/types";
import { coresDe, numero, percentual } from "./paleta";
import { linhasDeDistribuicao, TabelaDoGrafico } from "./TabelaDoGrafico";

/**
 * Parte-e-todo: rosca quando há composição, barra empilhada quando não há.
 *
 * **A degradação não é detalhe.** Com duas fatias, uma rosca é o anti-padrão da
 * "pizza de dois pedaços": dois semicírculos não dizem nada que dois números não
 * digam melhor, e num recorte pequeno — dois respondentes, um de cada lado — o
 * desenho vira um símbolo de 50/50 com ar de conclusão. Abaixo de três fatias
 * isto vira uma barra dividida, que é honesta em qualquer tamanho de amostra.
 *
 * O anel é um círculo só com `stroke-dasharray`, um por fatia — por isso não há
 * cálculo de arco em lugar nenhum. O que separa uma fatia da vizinha é um vão de
 * 2px na cor da superfície, e não um contorno: duas fatias do mesmo polo (dois
 * desfechos que ambos seguram) continuam sendo duas, sem precisar de uma cor
 * inventada para a segunda.
 */

const RAIO = 42;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
/** O vão entre fatias, em unidades do viewBox — equivale a ~2px no tamanho renderizado. */
const VAO = 1.6;

export function Rosca({
  fatias,
  total,
  desfechos,
  rotuloDoCentro = "no recorte",
}: {
  fatias: Fatia[];
  total: number;
  desfechos?: Desfecho[];
  rotuloDoCentro?: string;
}) {
  const cores = coresDe(
    fatias.map((f) => f.rotulo),
    desfechos,
  );

  if (fatias.length === 0) {
    return <p className="text-sm text-ink-600">Nada para mostrar neste recorte.</p>;
  }

  const legenda = (
    <ul className="flex-1 min-w-[12rem] space-y-2">
      {fatias.map((f) => (
        <li key={f.rotulo} className="flex items-center gap-2.5 text-sm">
          <span
            aria-hidden
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: cores[f.rotulo] }}
          />
          {/* O texto nunca veste a cor da série: identidade vem do ponto ao lado.
              Rótulo claro como texto seria ilegível sobre o papel. */}
          <span className="text-ink-700 truncate flex-1" title={f.rotulo}>
            {f.rotulo}
          </span>
          <span className="mono text-ink-900 shrink-0">{numero(f.n)}</span>
          <span className="mono text-ink-600 shrink-0 w-12 text-right">
            {percentual(f.fracao)}
          </span>
        </li>
      ))}
    </ul>
  );

  const tabela = (
    <TabelaDoGrafico colunas={["Desfecho", "Submissões", "Fatia"]} linhas={linhasDeDistribuicao(fatias)} />
  );

  /*
   * Amostra pequena: barra dividida, não rosca.
   *
   * Também vale para uma fatia só — um anel inteiro de uma cor é um círculo
   * dizendo "100%", que o próprio número já diz.
   */
  if (fatias.length < 3) {
    return (
      <div>
        <div className="flex items-baseline gap-2 mb-4">
          {/* Figura de destaque em algarismo proporcional: `tabular-nums` num
              número grande dá a cada dígito a largura do zero, e "121" sai
              frouxo. Tabular só em coluna que alinha. */}
          <span className="display text-4xl">{numero(total)}</span>
          <span className="text-sm text-ink-600">{rotuloDoCentro}</span>
        </div>

        <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-5">
          {fatias.map((f) => (
            <div
              key={f.rotulo}
              style={{ width: `${Math.max(f.fracao * 100, 3)}%`, backgroundColor: cores[f.rotulo] }}
            />
          ))}
        </div>

        {legenda}
        {tabela}
      </div>
    );
  }

  let percorrido = 0;
  const resumo = fatias.map((f) => `${f.rotulo}: ${numero(f.n)} (${percentual(f.fracao)})`).join("; ");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
        <div className="relative shrink-0">
          <svg viewBox="0 0 120 120" className="w-40 h-40" role="img" aria-label={resumo}>
            <circle cx="60" cy="60" r={RAIO} fill="none" stroke="#E9EBEE" strokeWidth="15" />
            {fatias.map((f) => {
              const bruto = f.fracao * CIRCUNFERENCIA;
              /* O vão sai do fim da fatia, nunca a ponto de somi-la: uma fatia
                 menor que o próprio vão viraria um risco invisível. */
              const comprimento = Math.max(bruto - VAO, bruto * 0.35);
              const inicio = -percorrido;
              percorrido += bruto;
              return (
                <circle
                  key={f.rotulo}
                  cx="60"
                  cy="60"
                  r={RAIO}
                  fill="none"
                  stroke={cores[f.rotulo]}
                  strokeWidth="15"
                  strokeDasharray={`${comprimento} ${CIRCUNFERENCIA - comprimento}`}
                  strokeDashoffset={inicio}
                  transform="rotate(-90 60 60)"
                />
              );
            })}
          </svg>

          {/* O total em HTML por cima: dentro do SVG ele escalaria com o desenho
              e sairia da escala tipográfica. */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="display text-2xl">{numero(total)}</span>
            <span className="text-xs text-ink-600">{rotuloDoCentro}</span>
          </div>
        </div>

        {legenda}
      </div>
      {tabela}
    </div>
  );
}
