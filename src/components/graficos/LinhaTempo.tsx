import { PontoDaSerie } from "@/lib/analise";
import { Desfecho } from "@/lib/types";
import { coresDe, numero, SLOT1 } from "./paleta";
import { TabelaDoGrafico } from "./TabelaDoGrafico";

/**
 * A série no tempo.
 *
 * **Abaixo de três pontos não se desenha linha.** Dois pontos ligados por uma
 * reta inventam uma tendência que não existe: com uma submissão liberada num dia
 * e uma recusada no outro, o gráfico virava um X de ponta a ponta, que se lê como
 * uma inversão dramática e é o retrato de duas linhas de dado. Nesses casos a
 * forma certa é coluna, que não promete continuidade nenhuma entre um dia e o
 * seguinte.
 *
 * A caixa é fixa (`VB_L` × `VB_A`) e o SVG escala junto com o cartão. É escolha:
 * o alternativo é medir o contêiner no cliente, e medir exigiria tirar a tela
 * inteira do servidor para desenhar um gráfico que não tem estado. O preço é o
 * texto do eixo escalar junto — por isso os rótulos são curtos e poucos.
 */

const VB_L = 720;
const VB_A = 250;
const PAD = { cima: 16, direita: 10, baixo: 30, esquerda: 44 };

/** O topo do eixo sobe até um número redondo, nunca ao dado cru. */
function tetoRedondo(maximo: number): number {
  if (maximo <= 4) return Math.max(1, maximo);
  const magnitude = Math.pow(10, Math.floor(Math.log10(maximo)));
  for (const passo of [1, 2, 2.5, 5, 10]) {
    const candidato = passo * magnitude;
    if (candidato >= maximo) return candidato;
  }
  return 10 * magnitude;
}

export function LinhaTempo({
  pontos,
  series,
  desfechos,
  rotuloDoTotal = "Submissões",
}: {
  pontos: PontoDaSerie[];
  /** Vazio desenha uma série só, com o total. */
  series: string[];
  desfechos?: Desfecho[];
  rotuloDoTotal?: string;
}) {
  if (pontos.length === 0) {
    return <p className="text-sm text-ink-600">Nada para mostrar neste recorte.</p>;
  }

  const linhas = series.length ? series : [rotuloDoTotal];
  const cores = series.length ? coresDe(linhas, desfechos) : { [rotuloDoTotal]: SLOT1 };
  const valorDe = (p: PontoDaSerie, serie: string) =>
    series.length ? (p.porSerie[serie] ?? 0) : p.total;

  const tabela = (
    <TabelaDoGrafico
      colunas={["Período", ...linhas]}
      linhas={pontos.map((p) => [p.rotulo, ...linhas.map((s) => valorDe(p, s))])}
    />
  );

  /*
   * A legenda existe a partir de duas séries. Com uma só, o título do cartão já
   * diz o que está plotado, e uma caixa com um swatch repetiria o título.
   */
  const legenda =
    linhas.length > 1 ? (
      <ul className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
        {linhas.map((s) => (
          <li key={s} className="flex items-center gap-2 text-sm text-ink-700">
            <span aria-hidden className="w-4 h-0.5 rounded-full" style={{ backgroundColor: cores[s] }} />
            {s}
          </li>
        ))}
      </ul>
    ) : null;

  if (pontos.length < 3) {
    return (
      <div>
        <PoucosPontos pontos={pontos} linhas={linhas} cores={cores} valorDe={valorDe} />
        {legenda}
        {tabela}
      </div>
    );
  }

  const maximo = Math.max(1, ...pontos.flatMap((p) => linhas.map((s) => valorDe(p, s))));
  const teto = tetoRedondo(maximo);
  const larguraUtil = VB_L - PAD.esquerda - PAD.direita;
  const alturaUtil = VB_A - PAD.cima - PAD.baixo;

  const x = (i: number) => PAD.esquerda + (i / (pontos.length - 1)) * larguraUtil;
  const y = (v: number) => PAD.cima + alturaUtil - (v / teto) * alturaUtil;

  const caminho = (serie: string) =>
    pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(valorDe(p, serie)).toFixed(1)}`).join(" ");

  /* Área só com uma série: cinco preenchimentos translúcidos empilhados viram
     uma mancha em que nenhuma das cinco é legível. */
  const area =
    linhas.length === 1
      ? `${caminho(linhas[0])} L ${x(pontos.length - 1).toFixed(1)} ${(PAD.cima + alturaUtil).toFixed(1)} L ${x(0).toFixed(1)} ${(PAD.cima + alturaUtil).toFixed(1)} Z`
      : null;

  /* Marcas do eixo em números limpos, sem repetir: com teto 1, `0/0.5/1`
     arredondava para `0/1/1` e a mesma linha aparecia rotulada duas vezes. */
  const marcas = [...new Set([0, Math.round(teto / 2), teto])];
  const passo = Math.max(1, Math.ceil(pontos.length / 8));
  const resumo = `${rotuloDoTotal} de ${pontos[0].rotulo} a ${pontos[pontos.length - 1].rotulo}, em ${pontos.length} pontos. Maior valor: ${numero(maximo)}.`;

  return (
    <div>
      <svg viewBox={`0 0 ${VB_L} ${VB_A}`} className="w-full h-auto" role="img" aria-label={resumo}>
        {marcas.map((v) => (
          <g key={v}>
            {/* Filete sólido de 1px, um tom fora da superfície. Nunca tracejado:
                tracejo lê como projeção ou limite, e isto é só grade. */}
            <line x1={PAD.esquerda} x2={VB_L - PAD.direita} y1={y(v)} y2={y(v)} stroke="#DFE4E8" strokeWidth="1" />
            <text x={PAD.esquerda - 9} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#606574">
              {numero(v)}
            </text>
          </g>
        ))}

        {area && <path d={area} fill={cores[linhas[0]]} fillOpacity="0.10" />}

        {linhas.map((serie) => (
          <path
            key={serie}
            d={caminho(serie)}
            fill="none"
            stroke={cores[serie]}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/*
         * Marca só na ponta de cada série, e não em todo ponto.
         *
         * Ponto em tudo é "um número em cada ponto" com outro nome: com 30
         * baldes as bolinhas encostam e a linha some debaixo delas. A ponta é o
         * valor que interessa — onde a série chegou.
         *
         * O anel de 2px na cor da superfície é o que mantém a marca legível
         * quando duas séries se cruzam ali.
         */}
        {linhas.map((serie) => {
          const ultimo = pontos.length - 1;
          return (
            <circle
              key={serie}
              cx={x(ultimo)}
              cy={y(valorDe(pontos[ultimo], serie))}
              r="4.5"
              fill={cores[serie]}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          );
        })}

        {pontos.map((p, i) =>
          i % passo === 0 || i === pontos.length - 1 ? (
            <text
              key={p.chave}
              x={x(i)}
              y={VB_A - 9}
              textAnchor={i === 0 ? "start" : i === pontos.length - 1 ? "end" : "middle"}
              fontSize="11"
              fill="#606574"
            >
              {p.rotulo}
            </text>
          ) : null,
        )}
      </svg>

      {legenda}
      {tabela}
    </div>
  );
}

/**
 * Um ou dois períodos: colunas.
 *
 * Sem eixo Y e sem grade — com dois valores, a régua é ruído: o número escrito na
 * cabeça da coluna diz tudo que o eixo diria.
 */
function PoucosPontos({
  pontos,
  linhas,
  cores,
  valorDe,
}: {
  pontos: PontoDaSerie[];
  linhas: string[];
  cores: Record<string, string>;
  valorDe: (p: PontoDaSerie, serie: string) => number;
}) {
  const maximo = Math.max(1, ...pontos.flatMap((p) => linhas.map((s) => valorDe(p, s))));

  return (
    <div className="flex gap-8">
      {pontos.map((p) => (
        <div key={p.chave} className="flex-1 min-w-0">
          <div className="flex items-end gap-2 h-28">
            {linhas.map((s) => {
              const v = valorDe(p, s);
              return (
                <div key={s} className="flex-1 flex flex-col justify-end h-full min-w-0">
                  <span className="mono text-xs text-ink-700 text-center mb-1">{numero(v)}</span>
                  {/* Ponta arredondada em 4px, base quadrada: a coluna cresce de
                      uma linha de base e é lá que ela precisa assentar. */}
                  <div
                    className="w-full rounded-t-[4px]"
                    style={{
                      height: `${v > 0 ? Math.max((v / maximo) * 100, 3) : 0}%`,
                      backgroundColor: cores[s],
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="border-t hairline-strong mt-0 pt-1.5 text-center text-xs text-ink-600">
            {p.rotulo}
          </div>
        </div>
      ))}
    </div>
  );
}
